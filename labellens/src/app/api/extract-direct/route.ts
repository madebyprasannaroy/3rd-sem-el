// POST /api/extract-direct: Accepts images as base64 in a JSON body, runs Gemini Vision OCR, evaluates anti-counterfeit checks, and saves directly to Supabase.
import { NextResponse } from "next/server";
import { extractWithGemini, type ImageInput } from "@/core/geminiExtractor";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, getOrCreateDefaultUserId } from "@/lib/supabaseServer";
import { evaluateAntiCounterfeit, type MasterTemplate, DEFAULT_MASTER_TEMPLATES } from "@/core/antiCounterfeit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { images, title, scanType, barcode, batchNumber, geoLocation } = body as {
      images: { panel: string; base64: string; mimeType: string }[];
      title?: string;
      scanType?: string;
      barcode?: string;
      batchNumber?: string;
      geoLocation?: { city?: string; state?: string; lat?: number; lng?: number };
    };

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "No packaging images were provided for extraction.", fields: [] },
        { status: 400 }
      );
    }

    // Convert base64 payloads to ImageInput buffers
    const imageInputs: ImageInput[] = images.map((img, idx) => ({
      panelHint: img.panel || "full_pack",
      mimeType: img.mimeType || "image/jpeg",
      buffer: Buffer.from(img.base64, "base64"),
      assetId: `direct-asset-${idx}`,
    }));

    const extraction = await extractWithGemini(imageInputs, title || undefined);

    // Run Anti-Counterfeit & Fake Product Detection
    let templates: MasterTemplate[] = DEFAULT_MASTER_TEMPLATES;
    try {
      const admin = supabaseAdmin();
      const { data: dbTemplates } = await admin.from("product_master_templates").select("*");
      if (dbTemplates && dbTemplates.length > 0) {
        templates = dbTemplates.map((t) => ({
          id: t.id,
          brand_name: t.brand_name,
          product_name: t.product_name,
          official_barcode: t.official_barcode,
          expected_fssai_license: t.expected_fssai_license,
          allowed_batch_regex: t.allowed_batch_regex,
          authorized_cities: t.authorized_cities,
          golden_extracted_fields: t.golden_extracted_fields || {},
        }));
      }
    } catch {}

    const antiCounterfeitAssessment = evaluateAntiCounterfeit(
      extraction.fields,
      { barcode, batchNumber, geoLocation },
      templates
    );

    let scanId: string | null = null;

    // Persist directly into Supabase database
    try {
      const admin = supabaseAdmin();
      const session = await getSession();

      let ownerId: string | null = null;
      if (session && !session.isDemo && session.userId && session.userId.length === 36) {
        ownerId = session.userId;
      } else {
        ownerId = await getOrCreateDefaultUserId();
      }

      if (ownerId) {
        const resolvedTitle =
          title?.trim() ||
          extraction.product_summary?.product_name ||
          "New Package Scan";

        const { data: scanRow, error: scanInsertErr } = await admin
          .from("scans")
          .insert({
            title: resolvedTitle,
            owner_id: ownerId,
            scan_type: scanType === "draft_label" ? "draft_label" : "product",
            status: "needs_review",
          })
          .select("id")
          .single();

        if (!scanInsertErr && scanRow?.id) {
          scanId = scanRow.id;

          // Upload images to Supabase storage and create image_assets rows
          const assetMap = new Map<string, string>();
          for (const [idx, img] of imageInputs.entries()) {
            try {
              const fileExt = img.mimeType.split("/")[1] || "jpeg";
              const storageKey = `${ownerId}/${scanRow.id}/panel-${idx}.${fileExt}`;
              await admin.storage
                .from("scan-images")
                .upload(storageKey, img.buffer, { contentType: img.mimeType, upsert: true });

              const validPanel: "front" | "ingredients" | "nutrition" | "declaration" =
                img.panelHint === "ingredients" ||
                img.panelHint === "nutrition" ||
                img.panelHint === "declaration"
                  ? img.panelHint
                  : "front";

              const { data: assetRow } = await admin
                .from("image_assets")
                .insert({
                  scan_id: scanRow.id,
                  owner_id: ownerId,
                  panel: validPanel,
                  storage_key: storageKey,
                })
                .select("id")
                .single();

              if (assetRow?.id) {
                assetMap.set(validPanel, assetRow.id);
              }
            } catch (storageErr) {
              console.warn("Storage upload warning:", storageErr);
            }
          }

          // Insert extracted fields into Supabase
          if (extraction.fields && extraction.fields.length > 0) {
            const fieldRows = extraction.fields.map((f) => ({
              scan_id: scanRow.id,
              key: f.key,
              value: f.value,
              unit: f.unit || null,
              confidence: typeof f.confidence === "number" ? f.confidence : 0.9,
              status: f.status === "ok" || f.status === "uncertain" || f.status === "missing" ? f.status : "ok",
              source_asset_id: assetMap.get(f.panel_source) || null,
            }));

            await admin.from("extracted_fields").insert(fieldRows);
          }

          // Save Anti-Counterfeit Detection Log in Supabase
          try {
            await admin.from("counterfeit_detection_logs").insert({
              scan_id: scanRow.id,
              authenticity_score: antiCounterfeitAssessment.authenticity_score,
              verdict: antiCounterfeitAssessment.verdict,
              flags: antiCounterfeitAssessment.flags,
              geo_location: geoLocation || null,
            });
          } catch (logErr) {
            console.warn("Counterfeit detection log insert warning:", logErr);
          }
        }
      }
    } catch (dbErr) {
      console.warn("Database persistence note:", dbErr);
    }

    return NextResponse.json({
      ok: true,
      scan_id: scanId,
      detected_panels: extraction.detected_panels,
      product_summary: extraction.product_summary,
      fields: extraction.fields,
      fields_count: extraction.fields.length,
      anti_counterfeit: antiCounterfeitAssessment,
      message: extraction.message,
    });
  } catch (err: any) {
    console.error("Direct extraction error:", err);
    return NextResponse.json(
      { error: err.message || "Extraction failed", fields: [] },
      { status: 500 }
    );
  }
}
