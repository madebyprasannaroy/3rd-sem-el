// PATCH /api/scans/:id/fields/:fid: lets the scan owner correct one extracted value; a DB trigger records the audit trail.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { supabaseUser } from "@/lib/supabaseServer";
import { can } from "@/core/roles";

// Body schema: the new value (text, max 500 chars).
const Body = z.object({ value: z.string().trim().min(1).max(500) });

export async function PATCH(req: Request, { params }: { params: { id: string; fid: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(session.role, "field.correct")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid value" }, { status: 400 });

  // RLS + column grant allow this update only for the scan owner and only on the "value" column.
  // Note: only the value changes; confidence and status stay as extracted so the original uncertainty remains visible.
  const { data, error } = await supabaseUser().from("extracted_fields")
    .update({ value: parsed.data.value }).eq("id", params.fid).eq("scan_id", params.id).select("id,value").single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
