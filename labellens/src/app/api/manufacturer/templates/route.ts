// GET & POST /api/manufacturer/templates: Manage verified brand master templates & state routing allocations
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseUser, supabaseAdmin } from "@/lib/supabaseServer";
import { DEFAULT_MASTER_TEMPLATES, type MasterTemplate } from "@/core/antiCounterfeit";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = supabaseAdmin();
    const { data: dbTemplates, error } = await admin
      .from("product_master_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !dbTemplates || dbTemplates.length === 0) {
      // Return built-in default templates for demo/offline resilience
      return NextResponse.json({
        ok: true,
        templates: DEFAULT_MASTER_TEMPLATES,
        source: "seed_defaults",
      });
    }

    const templates: MasterTemplate[] = dbTemplates.map((t) => ({
      id: t.id,
      manufacturer_id: t.manufacturer_id,
      brand_name: t.brand_name,
      product_name: t.product_name,
      official_barcode: t.official_barcode,
      expected_fssai_license: t.expected_fssai_license,
      allowed_batch_regex: t.allowed_batch_regex,
      authorized_states: t.authorized_states || [],
      authorized_cities: t.authorized_cities || [],
      golden_extracted_fields: t.golden_extracted_fields || {},
    }));

    return NextResponse.json({
      ok: true,
      templates,
      source: "supabase",
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: true,
      templates: DEFAULT_MASTER_TEMPLATES,
      source: "fallback",
      warning: err.message,
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      brand_name,
      product_name,
      official_barcode,
      expected_fssai_license,
      allowed_batch_regex,
      authorized_states,
      authorized_cities,
      golden_extracted_fields,
    } = body;

    if (!brand_name || !product_name) {
      return NextResponse.json(
        { error: "brand_name and product_name are required fields." },
        { status: 400 }
      );
    }

    const admin = supabaseAdmin();

    const templatePayload = {
      brand_name: brand_name.trim(),
      product_name: product_name.trim(),
      official_barcode: official_barcode?.trim() || null,
      expected_fssai_license: expected_fssai_license?.trim() || null,
      allowed_batch_regex: allowed_batch_regex?.trim() || null,
      authorized_states: Array.isArray(authorized_states) ? authorized_states : [],
      authorized_cities: Array.isArray(authorized_cities) ? authorized_cities : [],
      golden_extracted_fields: golden_extracted_fields || {},
      manufacturer_id: session.userId && session.userId.length === 36 ? session.userId : undefined,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (id && !id.startsWith("tpl-")) {
      // Update existing record
      result = await admin
        .from("product_master_templates")
        .update(templatePayload)
        .eq("id", id)
        .select()
        .single();
    } else {
      // Upsert by official_barcode if present, or insert new
      if (templatePayload.official_barcode) {
        result = await admin
          .from("product_master_templates")
          .upsert(templatePayload, { onConflict: "official_barcode" })
          .select()
          .single();
      } else {
        result = await admin
          .from("product_master_templates")
          .insert(templatePayload)
          .select()
          .single();
      }
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({
      ok: true,
      template: result.data,
      message: "SKU state allocation & master template saved successfully.",
    });
  } catch (err: any) {
    console.error("Master template save error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save master template." },
      { status: 500 }
    );
  }
}

