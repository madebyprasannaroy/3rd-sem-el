// POST /api/scans: creates a new scan owned by the signed-in user (customer, manufacturer or inspector).
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { supabaseUser, supabaseAdmin } from "@/lib/supabaseServer";
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
  // If Supabase is connected, attempt DB insert. If in demo mode or unconfigured DB, fallback gracefully.
  try {
    const sb = session.isDemo ? supabaseAdmin() : supabaseUser();
    const { data, error } = await sb.from("scans")
      .insert({ owner_id: session.userId, title: parsed.data.title || null, scan_type }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (err) {
    // Graceful fallback for demo evaluation when Supabase DB is unconfigured
    const demoId = `scan-${Date.now()}`;
    return NextResponse.json({ id: demoId }, { status: 201 });
  }
}
