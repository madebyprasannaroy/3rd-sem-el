// Dashboard: role-specific home for LabelLens (India Edition)
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { supabaseUser, supabaseAdmin } from "@/lib/supabaseServer";
import type { ScanRow } from "@/components/LiveScanList";
import DemoRoleSwitcher from "@/components/ui/DemoRoleSwitcher";
import Navbar from "@/components/ui/Navbar";
import CustomerDashboard from "@/components/dashboard/CustomerDashboard";
import ManufacturerDashboard from "@/components/dashboard/ManufacturerDashboard";
import InspectorDashboard from "@/components/dashboard/InspectorDashboard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  let scans: ScanRow[] = [];

  try {
    const sb = session.isDemo ? supabaseAdmin() : supabaseUser();
    const { data } = await sb
      .from("scans")
      .select("id,title,status,scan_type,owner_id,created_at")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      scans = data as ScanRow[];
    }
  } catch {
    // If Supabase is unconfigured or in demo mode with empty DB
  }

  // Fallback demo scans if no records exist yet
  if (scans.length === 0) {
    scans = [
      {
        id: "sample-scan-1",
        title: "NutriChoice Digestive Cookies 100g",
        status: "needs_review",
        scan_type: "product",
        owner_id: session.userId,
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: "sample-scan-2",
        title: "Mango Nectar Real Fruit 200ml",
        status: "completed",
        scan_type: "product",
        owner_id: session.userId,
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
      {
        id: "sample-draft-1",
        title: "Choco Crunch Bar 50g Pre-Print Proof",
        status: "needs_review",
        scan_type: "draft_label",
        owner_id: session.userId,
        created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      },
    ];
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1-Click Demo Persona Switcher Bar */}
      <DemoRoleSwitcher currentRole={session.role} isDemo={session.isDemo} />

      {/* Main Navbar */}
      <Navbar role={session.role} userEmail={session.email} />

      {/* Role-Specific Workspace Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {session.role === "customer" && (
          <CustomerDashboard initialScans={scans} userId={session.userId} />
        )}

        {session.role === "manufacturer" && (
          <ManufacturerDashboard initialScans={scans} />
        )}

        {session.role === "inspector" && (
          <InspectorDashboard initialScans={scans} />
        )}
      </main>
    </div>
  );
}
