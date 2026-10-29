// POST /api/scans: creates a new scan owned by the signed-in user (customer, manufacturer or inspector).
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { supabaseUser } from "@/lib/supabaseServer";
import { can } from "@/core/roles";

// Request body schema: optional short title.
const Body = z.object({ title: z.string().trim().max(120).optional() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!can(session.role, "scan.create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  // Manufacturers upload proposed labels; everyone else scans real products.
  const scan_type = session.role === "manufacturer" ? "draft_label" : "product";
  const { data, error } = await supabaseUser().from("scans")
    .insert({ owner_id: session.userId, title: parsed.data.title || null, scan_type }).select("id").single();
  if (error) return NextResponse.json({ error: "Could not create scan" }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
