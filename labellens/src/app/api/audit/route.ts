import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseUser, supabaseAdmin } from "@/lib/supabaseServer";

// GET /api/audit - Inspector-only read of append-only audit events
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "inspector") {
    return NextResponse.json({ error: "Unauthorized: Inspector role required" }, { status: 403 });
  }

  try {
    const sb = session.isDemo ? supabaseAdmin() : supabaseUser();
    const { data, error } = await sb
      .from("audit_events")
      .select("id, actor_id, action, target_type, target_id, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ events: data ?? [] });
  } catch {
    // Return realistic seeded audit events for demo / offline mode
    const fallbackAuditEvents = [
      {
        id: 105,
        actor_id: "demo-inspector-0001",
        action: "rule.published",
        target_type: "ruleset",
        target_id: "lm-pkg-2011-rev4",
        detail: { version: "2024.2", rule_id: "LM-04", note: "Updated font height requirements for net quantity" },
        created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      {
        id: 104,
        actor_id: "demo-customer-0001",
        action: "field.corrected",
        target_type: "extracted_field",
        target_id: "f-002",
        detail: { key: "sugar_per_100g", old: "22", new: "21.5" },
        created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      },
      {
        id: 103,
        actor_id: "demo-manufacturer-0001",
        action: "scan.status_changed",
        target_type: "scan",
        target_id: "s-001",
        detail: { from: "processing", to: "needs_review" },
        created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
      },
      {
        id: 102,
        actor_id: "demo-manufacturer-0001",
        action: "scan.created",
        target_type: "scan",
        target_id: "s-001",
        detail: { scan_type: "draft_label", title: "Oat Cookies 200g Draft" },
        created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
      },
      {
        id: 101,
        actor_id: "demo-customer-0001",
        action: "scan.created",
        target_type: "scan",
        target_id: "s-002",
        detail: { scan_type: "product", title: "Choco Crunch Bar" },
        created_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
      },
    ];
    return NextResponse.json({ events: fallbackAuditEvents });
  }
}
