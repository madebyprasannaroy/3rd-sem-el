"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ChevronRight, Clock, User, QrCode, Sparkles } from "lucide-react";

export interface ScanRow {
  id: string;
  title: string | null;
  status: string;
  scan_type: string;
  owner_id: string;
  created_at: string;
}

export default function LiveScanList({ initial, showOwner }: { initial: ScanRow[]; showOwner: boolean }) {
  const [scans, setScans] = useState<ScanRow[]>(initial);

  useEffect(() => {
    const sb = supabaseBrowser();
    // Subscribe to all changes on scans; RLS limits which rows this user receives.
    const channel = sb
      .channel("scans-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scans" }, (payload) => {
        const row = payload.new as ScanRow;
        setScans((cur) =>
          [row, ...cur.filter((s) => s.id !== row.id)].sort((a, b) =>
            b.created_at.localeCompare(a.created_at)
          )
        );
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  if (scans.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
        <QrCode className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-700">No scans recorded yet</p>
        <p className="text-xs text-slate-500 mt-1">Live updates will appear automatically without refresh.</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
    needs_review: "bg-amber-100 text-amber-800 border-amber-300",
    processing: "bg-blue-100 text-blue-800 border-blue-300 animate-pulse",
    uploaded: "bg-slate-100 text-slate-800 border-slate-300",
    failed: "bg-rose-100 text-rose-800 border-rose-300",
  };

  return (
    <div className="divide-y divide-slate-100">
      {scans.map((s) => (
        <div
          key={s.id}
          className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-mono text-xs font-bold uppercase shrink-0">
              {s.title ? s.title.slice(0, 2) : "PK"}
            </div>
            <div>
              <Link
                href={`/scan/${s.id}`}
                className="font-bold text-slate-900 hover:text-brand-700 text-sm flex items-center gap-1.5 transition-colors"
              >
                <span>{s.title ?? "Untitled scan"}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="capitalize font-medium text-slate-700">
                  {s.scan_type === "draft_label" ? "Draft label (Pre-press)" : "Pack Scan (Commercial)"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {showOwner && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                      <User className="w-3 h-3" />
                      owner: {s.owner_id.slice(0, 8)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              statusColors[s.status] || "bg-slate-100 text-slate-800 border-slate-300"
            }`}
          >
            {s.status}
          </span>
        </div>
      ))}
    </div>
  );
}
