// POST /api/scans/:id/extract: runs the (stub) extractor on photos not yet processed and moves the scan to needs_review.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseUser, supabaseAdmin } from "@/lib/supabaseServer";
import { can } from "@/core/roles";
import { assertTransition, type ScanStatus } from "@/core/scanStatus";
import { stubExtract } from "@/core/stubExtractor";
import type { Panel } from "@/core/uploadValidation";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(session.role, "scan.extract")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Authorize first with the user's own client (RLS), then do privileged writes with the admin client.
  const { data: scan } = await supabaseUser().from("scans").select("id,owner_id,status").eq("id", params.id).single();
  if (!scan || scan.owner_id !== session.userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try { assertTransition(scan.status as ScanStatus, "processing"); }
  catch { return NextResponse.json({ error: `Scan is ${scan.status}; cannot start extraction` }, { status: 409 }); }

  const admin = supabaseAdmin();
  const { data: assets } = await admin.from("image_assets").select("id,panel").eq("scan_id", params.id);
  if (!assets || assets.length === 0) return NextResponse.json({ error: "Upload at least one photo first" }, { status: 400 });

  await admin.from("scans").update({ status: "processing" }).eq("id", params.id);
  try {
    // Skip photos that already have fields so reruns never duplicate rows or overwrite user corrections.
    const { data: done } = await admin.from("extracted_fields").select("source_asset_id").eq("scan_id", params.id);
    const doneIds = new Set((done ?? []).map((d) => d.source_asset_id));
    const rows = assets.filter((a) => !doneIds.has(a.id)).flatMap((a) =>
      stubExtract(a.panel as Panel).map((f) => ({ ...f, scan_id: params.id, source_asset_id: a.id })));
    if (rows.length) await admin.from("extracted_fields").insert(rows);
    await new Promise((r) => setTimeout(r, 1500)); // short pause so the live "processing" state is visible in the demo
    await admin.from("scans").update({ status: "needs_review" }).eq("id", params.id);
    return NextResponse.json({ ok: true });
  } catch {
    await admin.from("scans").update({ status: "failed" }).eq("id", params.id);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
