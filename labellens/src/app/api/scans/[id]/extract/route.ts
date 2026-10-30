// POST /api/scans/:id/extract: multimodal extraction across all uploaded panels using Gemini Vision API.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseUser, supabaseAdmin } from "@/lib/supabaseServer";
import { can } from "@/core/roles";
import { assertTransition, type ScanStatus } from "@/core/scanStatus";
import { extractWithGemini, type ImageInput } from "@/core/geminiExtractor";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(session.role, "scan.extract")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const sb = session.isDemo ? supabaseAdmin() : supabaseUser();
    const admin = supabaseAdmin();

    // 1. Fetch scan record
    const { data: scan } = await sb.from("scans").select("id,title,owner_id,status").eq("id", params.id).single();

    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.owner_id !== session.userId && session.role !== "inspector") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      assertTransition(scan.status as ScanStatus, "processing");
    } catch {
      // If already processing or reviewed, proceed with extraction
    }

    await admin.from("scans").update({ status: "processing" }).eq("id", params.id);

    // 2. Retrieve all image assets for this scan
    const { data: assets } = await admin
      .from("image_assets")
      .select("id,panel,storage_key")
      .eq("scan_id", params.id);

    const imageInputs: ImageInput[] = [];

    if (assets && assets.length > 0) {
      for (const asset of assets) {
        try {
          const { data: fileData, error: dlError } = await admin.storage
            .from("scan-images")
            .download(asset.storage_key);

          if (!dlError && fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            imageInputs.push({
              panelHint: asset.panel,
              mimeType: fileData.type || "image/jpeg",
              buffer: Buffer.from(arrayBuffer),
              assetId: asset.id,
            });
          }
        } catch (downloadErr) {
          console.warn(`Could not download image asset ${asset.id}:`, downloadErr);
        }
      }
    }

    // 3. Multimodal extraction with Gemini Vision
    const extraction = await extractWithGemini(imageInputs, scan.title || undefined);
    const result = extraction.result;

    // 4. Batch upsert into extracted_fields table
    if (result.fields && result.fields.length > 0) {
      const rows = result.fields.map((f) => {
        // Link to matching asset if panel matches, else first asset
        const matchingAsset = assets?.find((a) => a.panel === f.panel_source) || assets?.[0];
        return {
          scan_id: params.id,
          key: f.key,
          value: f.value,
          unit: f.unit || null,
          confidence: f.confidence,
          status: f.status,
          source_asset_id: matchingAsset?.id || null,
        };
      });

      // Clear previous fields for this scan if re-running
      await admin.from("extracted_fields").delete().eq("scan_id", params.id);
      await admin.from("extracted_fields").insert(rows);
    }

    // 5. Update scan status to needs_review
    await admin.from("scans").update({ status: "needs_review" }).eq("id", params.id);

    return NextResponse.json({
      ok: true,
      detected_panels: result.detected_panels,
      fields_count: result.fields.length,
      message: extraction.message,
    });
  } catch (err: any) {
    console.error("Extraction route exception:", err);
    try {
      const admin = supabaseAdmin();
      await admin.from("scans").update({ status: "needs_review" }).eq("id", params.id);
    } catch { }

    return NextResponse.json(
      { error: err.message || "Extraction failed", fields: [] },
      { status: 500 }
    );
  }
}
