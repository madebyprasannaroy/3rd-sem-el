// GET /api/scans/:id/anti-counterfeit: Evaluates or retrieves anti-counterfeit authenticity assessment
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseUser, supabaseAdmin } from "@/lib/supabaseServer";
import { evaluateAntiCounterfeit, type MasterTemplate, DEFAULT_MASTER_TEMPLATES } from "@/core/antiCounterfeit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = session.isDemo ? supabaseAdmin() : supabaseUser();
  const admin = supabaseAdmin();

  try {
    // 1. Check if an assessment log already exists in Supabase
    const { data: existingLog } = await sb
      .from("counterfeit_detection_logs")
      .select("*")
      .eq("scan_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLog) {
      return NextResponse.json({
        ok: true,
        assessment: {
          authenticity_score: existingLog.authenticity_score,
          verdict: existingLog.verdict,
          flags: existingLog.flags,
          geo_location: existingLog.geo_location,
        },
      });
    }

    // 2. Load extracted fields from Supabase
    const { data: fieldsData } = await sb
      .from("extracted_fields")
      .select("key, value")
      .eq("scan_id", params.id);

    const fields = (fieldsData || []).map((f) => ({ key: f.key, value: f.value }));

    // 3. Fetch custom master templates from Supabase, or use built-in defaults
    const { data: dbTemplates } = await admin
      .from("product_master_templates")
      .select("*");

    const templates: MasterTemplate[] = (dbTemplates && dbTemplates.length > 0)
      ? dbTemplates.map((t) => ({
          id: t.id,
          brand_name: t.brand_name,
          product_name: t.product_name,
          official_barcode: t.official_barcode,
          expected_fssai_license: t.expected_fssai_license,
          allowed_batch_regex: t.allowed_batch_regex,
          authorized_states: t.authorized_states,
          authorized_cities: t.authorized_cities,
          golden_extracted_fields: t.golden_extracted_fields || {},
        }))
      : DEFAULT_MASTER_TEMPLATES;

    // 4. Run pure evaluation
    const assessment = evaluateAntiCounterfeit(fields, {}, templates);

    // 5. Persist log if scan exists in Supabase
    try {
      await admin.from("counterfeit_detection_logs").insert({
        scan_id: params.id,
        authenticity_score: assessment.authenticity_score,
        verdict: assessment.verdict,
        flags: assessment.flags,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      assessment,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to run anti-counterfeit evaluation" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();

  try {
    const body = await req.json().catch(() => ({}));
    const { barcode, batchNumber, geoLocation, fields: bodyFields } = body;

    let fields = bodyFields;

    // If fields not provided in request body, fetch from database
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      const { data: fieldsData } = await admin
        .from("extracted_fields")
        .select("key, value")
        .eq("scan_id", params.id);

      fields = (fieldsData || []).map((f) => ({ key: f.key, value: f.value }));
    }

    // Load templates
    const { data: dbTemplates } = await admin
      .from("product_master_templates")
      .select("*");

    const templates: MasterTemplate[] = (dbTemplates && dbTemplates.length > 0)
      ? dbTemplates.map((t) => ({
          id: t.id,
          brand_name: t.brand_name,
          product_name: t.product_name,
          official_barcode: t.official_barcode,
          expected_fssai_license: t.expected_fssai_license,
          allowed_batch_regex: t.allowed_batch_regex,
          authorized_states: t.authorized_states,
          authorized_cities: t.authorized_cities,
          golden_extracted_fields: t.golden_extracted_fields || {},
        }))
      : DEFAULT_MASTER_TEMPLATES;

    const assessment = evaluateAntiCounterfeit(
      fields,
      { barcode, batchNumber, geoLocation },
      templates
    );

    // Save to database
    try {
      await admin.from("counterfeit_detection_logs").insert({
        scan_id: params.id,
        authenticity_score: assessment.authenticity_score,
        verdict: assessment.verdict,
        flags: assessment.flags,
        geo_location: geoLocation || null,
      });
    } catch {}

    return NextResponse.json({
      ok: true,
      assessment,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to evaluate anti-counterfeit" },
      { status: 500 }
    );
  }
}

