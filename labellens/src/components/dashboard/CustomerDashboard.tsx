"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, QrCode, MessageSquare, Globe2, Sparkles, ChevronRight, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import type { ScanRow } from "@/components/LiveScanList";
import PlainLanguageNutrition from "./PlainLanguageNutrition";
import CustomerChatDrawer from "./CustomerChatDrawer";
import InternationalComparison from "./InternationalComparison";

interface CustomerDashboardProps {
  initialScans: ScanRow[];
  userId: string;
}

export default function CustomerDashboard({ initialScans, userId }: CustomerDashboardProps) {
  const [scans, setScans] = useState<ScanRow[]>(initialScans);
  const [chatOpen, setChatOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState<string>(
    initialScans[0]?.id || "sample-scan-1"
  );

  const selectedScan = scans.find((s) => s.id === selectedScanId) || scans[0];

  const panels = [
    { name: "Front Panel", desc: "Brand, name & net weight", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { name: "Ingredients", desc: "Formulation & palm oil check", color: "bg-blue-50 text-blue-800 border-blue-200" },
    { name: "Nutrition", desc: "Sugar, salt & trans-fat table", color: "bg-amber-50 text-amber-800 border-amber-200" },
    { name: "Declarations", desc: "MRP, dates & FSSAI lic. no", color: "bg-purple-50 text-purple-800 border-purple-200" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Quick-Capture Banner */}
      <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-emerald-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-medium mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Food Label Intelligence • India Edition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Verify Any Indian Food Pack in Seconds
          </h1>
          <p className="text-emerald-100/90 text-sm mt-2 leading-relaxed">
            Snap photos of the 4 key panels. We extract mandatory FSSAI declarations, translate sugar to teaspoons, separate elemental sodium from salt, and ground every insight directly to the label.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/scan/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-brand-900 hover:bg-emerald-50 font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              <Camera className="w-4 h-4 text-brand-700" />
              <span>Start New Pack Scan</span>
            </Link>

            <button
              onClick={() => {
                setSelectedScanId(scans[0]?.id || "sample-scan-1");
                setChatOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all"
            >
              <MessageSquare className="w-4 h-4 text-emerald-300" />
              <span>Ask Label Assistant</span>
            </button>

            <button
              onClick={() => {
                setSelectedScanId(scans[0]?.id || "sample-scan-1");
                setCompareOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/60 border border-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all"
            >
              <Globe2 className="w-4 h-4 text-blue-300" />
              <span>Compare with UK/EU</span>
            </button>
          </div>
        </div>

        {/* 4 Panel Guidance Grid */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {panels.map((p, i) => (
            <div key={i} className="bg-black/20 rounded-lg p-2.5 border border-white/10">
              <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Panel {i + 1}</span>
              <span className="text-xs font-semibold text-white block mt-0.5">{p.name}</span>
              <span className="text-[11px] text-emerald-200/70 block mt-0.5">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Deterministic Plain-Language Nutrition Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Consumer Health Clarity
          </h2>
          {selectedScan && (
            <span className="text-xs text-slate-500">
              Showing insights for: <strong className="text-slate-800">{selectedScan.title || "Latest Scan"}</strong>
            </span>
          )}
        </div>
        <PlainLanguageNutrition
          sugarGrams={22}
          sodiumMg={280}
          saturatedFatGrams={11.2}
          transFatGrams={0}
          servingGrams={100}
        />
      </div>

      {/* Recent Scans Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Your Scanned Packs</h3>
            <p className="text-xs text-slate-500">Track and review OCR extractions and field audit trails</p>
          </div>
          <Link
            href="/scan/new"
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1"
          >
            <span>Scan Another</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {scans.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <QrCode className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-700">No product scans yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Tap the capture button above to scan your first packaged snack, beverage, or cereal pack.
            </p>
            <Link
              href="/scan/new"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-700 text-white text-xs font-semibold shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capture Front, Ingredients & Nutrition</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {scans.map((scan) => {
              const statusColors: Record<string, string> = {
                completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
                needs_review: "bg-amber-100 text-amber-800 border-amber-300",
                processing: "bg-blue-100 text-blue-800 border-blue-300",
                uploaded: "bg-slate-100 text-slate-800 border-slate-300",
                failed: "bg-rose-100 text-rose-800 border-rose-300",
              };

              return (
                <div
                  key={scan.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 font-bold text-xs uppercase">
                      {scan.title ? scan.title.substring(0, 2) : "PK"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/scan/${scan.id}`}
                          className="font-bold text-slate-900 hover:text-brand-700 transition-colors text-sm"
                        >
                          {scan.title || "Untitled Product Scan"}
                        </Link>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                            statusColors[scan.status] || "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {scan.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(scan.created_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{scan.scan_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => {
                        setSelectedScanId(scan.id);
                        setChatOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                      <span>Chat</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedScanId(scan.id);
                        setCompareOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Compare</span>
                    </button>

                    <Link
                      href={`/scan/${scan.id}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-700 hover:bg-brand-800 text-white flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <span>Review Fields</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Drawers & Modals */}
      <CustomerChatDrawer
        scanId={selectedScanId}
        productName={selectedScan?.title || "Scanned Indian Product"}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      <InternationalComparison
        scanId={selectedScanId}
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
    </div>
  );
}
