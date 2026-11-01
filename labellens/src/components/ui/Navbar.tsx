"use client";

import Link from "next/link";
import { useState } from "react";
import { QrCode, ScanLine, LogOut, ShieldCheck, ChevronRight } from "lucide-react";
import type { Role } from "@/core/roles";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

interface NavbarProps {
  role?: Role;
  userEmail?: string;
}

export default function Navbar({ role = "customer", userEmail }: NavbarProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const roleLabels: Record<Role, { label: string; badgeClass: string; desc: string }> = {
    customer: {
      label: "Consumer Mode",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      desc: "Plain Nutrition & Pack Verification",
    },
    manufacturer: {
      label: "Manufacturer Portal",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
      desc: "Pre-Print Legal Metrology Checklist",
    },
    inspector: {
      label: "Inspector Governance",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      desc: "Enforcement & Rule Administration",
    },
  };

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      await supabaseBrowser().auth.signOut();
    } catch (e) {
      console.error("Sign out error:", e);
    } finally {
      window.location.href = "/login";
    }
  }

  const roleMeta = roleLabels[role] || roleLabels.customer;

  return (
    <header className="bg-slate-900/85 backdrop-blur-md border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand logo & Indian regulatory badge */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-brand-700 flex items-center justify-center text-white shadow-sm group-hover:bg-brand-800 transition-all">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">LabelLens</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  <span className="text-[11px]">🇮🇳</span> India Edition
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">FSSAI & Legal Metrology Compliance</p>
            </div>
          </Link>
        </div>

        {/* Center / Role identifier */}
        <div className="hidden md:flex items-center gap-2">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${roleMeta.badgeClass} flex items-center gap-1.5`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            {roleMeta.label}
          </span>
          <span className="text-xs text-slate-600">•</span>
          <span className="text-xs text-slate-400">{roleMeta.desc}</span>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-3">
          <Link
            href="/scan/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-brand-700 hover:bg-brand-800 text-white shadow-sm transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">
              {role === "manufacturer" ? "Upload Draft Label" : "Capture Pack"}
            </span>
            <span className="sm:hidden">Scan</span>
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out of session"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
