// Scan page (server part): loads the scan, its fields and signed photo URLs, then renders the enhanced live view.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { supabaseUser, supabaseAdmin } from "@/lib/supabaseServer";
import ScanView, { type Field, type Photo } from "@/components/ScanView";
import DemoRoleSwitcher from "@/components/ui/DemoRoleSwitcher";
import Navbar from "@/components/ui/Navbar";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sb = session.isDemo ? supabaseAdmin() : supabaseUser();
  let scan: { id: string; title: string | null; status: string; owner_id: string } | null = null;
  let fields: Field[] = [];
  let photos: Photo[] = [];

  try {
    const { data: scanData } = await sb
      .from("scans")
      .select("id,title,status,owner_id")
      .eq("id", params.id)
      .single();

    if (scanData) {
      scan = scanData;
      const { data: fieldsData } = await sb
        .from("extracted_fields")
        .select("id,key,value,unit,confidence,status")
        .eq("scan_id", params.id)
        .order("key");

      if (fieldsData) {
        fields = fieldsData as Field[];
      }

      const { data: assets } = await sb
        .from("image_assets")
        .select("id,panel,storage_key")
        .eq("scan_id", params.id);

      photos = await Promise.all(
        (assets ?? []).map(async (a) => {
          const { data } = await sb.storage.from("scan-images").createSignedUrl(a.storage_key, 600);
          return { id: a.id, panel: a.panel, url: data?.signedUrl ?? null };
        })
      );
    }
  } catch {
    // If not found in live DB, scan remains null and will be hydrated from localStorage on client
  }

  // If scan record not in Supabase, pass empty state to let client hydrate from localStorage
  if (!scan) {
    scan = {
      id: params.id,
      title: null,
      status: "needs_review",
      owner_id: session.userId,
    };
    fields = [];
    photos = [];
  }

  const canEdit = scan.owner_id === session.userId || session.isDemo === true;

  return (
    <div className="min-h-screen bg-slate-950/40 text-slate-100 flex flex-col relative font-tenor">
      {/* 1-Click Demo Persona Switcher Bar */}
      <DemoRoleSwitcher currentRole={session.role} isDemo={session.isDemo} />

      {/* Main Navbar */}
      <Navbar role={session.role} userEmail={session.email} />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-4 relative z-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-eucalyptus hover:text-clay transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="text-xs text-eucalyptus/70">
            India Edition • Legal Metrology (Packaged Commodities) Rules 2011
          </div>
        </div>

        {/* Interactive Extraction Review Component */}
        <ScanView
          scanId={scan.id}
          initialTitle={scan.title}
          initialStatus={scan.status}
          initialFields={fields}
          photos={photos}
          canEdit={canEdit}
        />
      </main>
    </div>
  );
}
