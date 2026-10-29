"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Factory, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import type { Role } from "@/core/roles";

interface DemoRoleSwitcherProps {
  currentRole: Role;
  isDemo?: boolean;
}

export default function DemoRoleSwitcher({ currentRole, isDemo = false }: DemoRoleSwitcherProps) {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<Role>(currentRole);
  const [switching, setSwitching] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    setActiveRole(currentRole);
  }, [currentRole]);

  async function handleSwitch(role: Role) {
    if (role === activeRole && isDemo) return;
    setSwitching(true);
    try {
      await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      setActiveRole(role);
      router.refresh();
      // Brief delay to allow cookie to register
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 150);
    } catch (e) {
      console.error("Failed to switch demo persona:", e);
      setSwitching(false);
    }
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-3 py-2 rounded-full shadow-lg text-xs flex items-center gap-2 border border-slate-700 hover:bg-slate-800 transition-all"
        title="Open Demo Persona Switcher"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Demo: <strong>{activeRole}</strong></span>
      </button>
    );
  }

  return (
    <div className="bg-slate-950 text-slate-200 border-b border-slate-800 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold text-slate-100 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Demo Persona Switcher</span>
        </span>
        <span className="hidden sm:inline text-slate-400">|</span>
        <span className="hidden sm:inline text-slate-400">1-click role view for live evaluators:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => handleSwitch("customer")}
          disabled={switching}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
            activeRole === "customer"
              ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Customer</span>
          {activeRole === "customer" && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
        </button>

        <button
          onClick={() => handleSwitch("manufacturer")}
          disabled={switching}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
            activeRole === "manufacturer"
              ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <Factory className="w-3.5 h-3.5" />
          <span>Manufacturer</span>
          {activeRole === "manufacturer" && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
        </button>

        <button
          onClick={() => handleSwitch("inspector")}
          disabled={switching}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
            activeRole === "inspector"
              ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-400"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Inspector</span>
          {activeRole === "inspector" && <CheckCircle2 className="w-3 h-3 ml-0.5" />}
        </button>

        <button
          onClick={() => setMinimized(true)}
          className="ml-2 text-slate-500 hover:text-slate-300 px-1 py-0.5 rounded text-[11px]"
          title="Minimize bar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
