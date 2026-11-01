"use client";

import { useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Printer,
  Sparkles,
  History,
  ChevronRight,
  MapPin,
  Globe,
} from "lucide-react";
import type { ScanRow } from "@/components/LiveScanList";
import StateAllocationManager from "./StateAllocationManager";

interface ChecklistItem {
  id: string;
  ruleTitle: string;
  legalBasis: string;
  field: string;
  value: string;
  status: "PASS" | "NEEDS REVIEW" | "FAIL";
  rationale: string;
}

export default function ManufacturerDashboard({ initialScans }: { initialScans: ScanRow[] }) {
  const [activeTab, setActiveTab] = useState<"compliance" | "geo_allocations">("compliance");
  const [selectedVersion, setSelectedVersion] = useState("Draft v2 (Latest)");
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const checklist: ChecklistItem[] = [
    {
      id: "CHK-01",
      ruleTitle: "Net Quantity Metric Units & Proportions",
      legalBasis: "Legal Metrology Rules 2011, Rule 12",
      field: "net_quantity",
      value: "100 g",
      status: "PASS",
      rationale: "Expressed in standard SI metric unit 'g'. Numeral height meets required 4mm minimum for display panel area 120cm².",
    },
    {
      id: "CHK-02",
      ruleTitle: "Maximum Retail Price (MRP) Syntax",
      legalBasis: "Legal Metrology Rules 2011, Rule 6(1)(e)",
      field: "mrp",
      value: "Missing or unreadable in draft proof",
      status: "FAIL",
      rationale: "Mandatory prefix 'MRP Rs.' or 'MRP ₹' inclusive of all taxes is not detectable on current packaging layout proof.",
    },
    {
      id: "CHK-03",
      ruleTitle: "Date of Manufacture & Best Before Format",
      legalBasis: "FSSAI (Labelling & Display) Regs 2020",
      field: "date_markings",
      value: "EXP: 10/25 (Needs MM/YY clarification)",
      status: "NEEDS REVIEW",
      rationale: "Best before declared as '10/25'. Recommended format is 'BEST BEFORE 12 MONTHS FROM MANUFACTURE' or explicit 'DD/MM/YYYY'.",
    },
    {
      id: "CHK-04",
      ruleTitle: "Vegetarian / Non-Vegetarian Symbol",
      legalBasis: "FSSAI Regs 2011, Cl. 2.2.2(4)",
      field: "veg_non_veg_logo",
      value: "Green filled circle in green border square",
      status: "PASS",
      rationale: "Symbol geometry and color contrast meet the 3mm diameter and 6mm square outer border standards.",
    },
    {
      id: "CHK-05",
      ruleTitle: "Consumer Care Grievance Officer Details",
      legalBasis: "Legal Metrology Amendment Rules 2021",
      field: "consumer_care",
      value: "Email + Phone detected; Postal PIN verified",
      status: "PASS",
      rationale: "Valid email (customercare@brand.in), customer phone number, and physical factory address are printed on back panel.",
    },
    {
      id: "CHK-06",
      ruleTitle: "Nutritional Declaration per 100g Breakdown",
      legalBasis: "FSSAI Labelling & Display Regulations 2020",
      field: "nutrition_table",
      value: "Sugar, Sodium, Saturated fat present; Trans fat marked 0g",
      status: "PASS",
      rationale: "All mandatory nutrient headers declared in correct sequence with per-100g values.",
    },
  ];

  const passCount = checklist.filter((c) => c.status === "PASS").length;
  const reviewCount = checklist.filter((c) => c.status === "NEEDS REVIEW").length;
  const failCount = checklist.filter((c) => c.status === "FAIL").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-Print Artwork Audit & Legal Metrology Verification</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Manufacturer Compliance Portal</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Upload pre-press artwork PDFs or label proofs to detect Legal Metrology & FSSAI labeling errors before plates and cylinders go to production.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/scan/new?type=draft_label"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New Draft Proof</span>
          </Link>

          <button
            onClick={() => setReportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
          >
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Export Preliminary Report</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-3 pb-1">
        <button
          onClick={() => setActiveTab("compliance")}
          className={`pb-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "compliance"
              ? "border-blue-600 text-blue-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Pre-Print Artwork Audits</span>
        </button>

        <button
          onClick={() => setActiveTab("geo_allocations")}
          className={`pb-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "geo_allocations"
              ? "border-emerald-600 text-emerald-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>State & Geo-Routing SKU Allocations</span>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Anti-Counterfeit
          </span>
        </button>
      </div>

      {/* Tab 1: Geo Allocations / Master Specs Manager */}
      {activeTab === "geo_allocations" ? (
        <StateAllocationManager />
      ) : (
        <>
          {/* Draft Version Bar & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Version Switcher */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-600" />
                Artwork Revision
              </span>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="mt-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="Draft v2 (Latest)">Draft v2 (Current Artwork Proof)</option>
                <option value="Draft v1 (Initial)">Draft v1 (Initial Pre-press)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-2">Active Rule Engine: 2024.2 (Latest Gazette)</span>
            </div>

            {/* Pass count */}
            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Compliant Checks
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-900">{passCount}</span>
                <span className="text-xs text-emerald-700">of {checklist.length} verified rules</span>
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">Ready for production packaging</span>
            </div>

            {/* Needs review */}
            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-sm">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Needs Review
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-900">{reviewCount}</span>
                <span className="text-xs text-amber-700">advisory warnings</span>
              </div>
              <span className="text-[11px] text-amber-700 mt-1 block">Inspect layout before cylinder engraving</span>
            </div>

            {/* Fail count */}
            <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-sm">
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-4 h-4 text-rose-600" />
                Non-Compliant
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-rose-900">{failCount}</span>
                <span className="text-xs text-rose-700">critical blocker</span>
              </div>
              <span className="text-[11px] text-rose-600 mt-1 block">Must correct before commercial printing</span>
            </div>
          </div>

          {/* Pre-Print Checklist Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Pre-Print Packaging Checklist</h2>
                <p className="text-xs text-slate-500">
                  Evaluated deterministically against active Legal Metrology Rules 2011 and FSSAI 2020 Display Standards
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500">Pack: Choco Crunch 100g Draft</span>
            </div>

            <div className="divide-y divide-slate-100">
              {checklist.map((item) => {
                const badgeClasses = {
                  PASS: "bg-emerald-100 text-emerald-800 border-emerald-300",
                  "NEEDS REVIEW": "bg-amber-100 text-amber-800 border-amber-300",
                  FAIL: "bg-rose-100 text-rose-800 border-rose-300",
                };

                return (
                  <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-slate-500">{item.id}</span>
                          <h3 className="text-sm font-bold text-slate-900">{item.ruleTitle}</h3>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeClasses[item.status]}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Source: {item.legalBasis}</p>
                        <div className="mt-2 text-xs text-slate-700 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                          <strong className="text-slate-900">Observed Value:</strong> {item.value}
                          <p className="text-slate-600 mt-1 leading-relaxed">{item.rationale}</p>
                        </div>
                      </div>

                      <div className="self-end sm:self-center shrink-0">
                        <Link
                          href="/scan/sample-draft-1"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          <span>Inspect Artwork Proof</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export Preliminary Report Modal */}
          {reportModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-sm">Preliminary Assisted Packaging Compliance Report</h3>
                  </div>
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Official Disclaimer Watermark Banner */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <strong>Statutory Notice:</strong> This preliminary report is an automated pre-print checklist to assist packaging designers and quality engineers. It is <strong>not</strong> an official certification, statutory stamp, or government license.
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Product Title:</span>
                      <span className="font-bold">Choco Crunch Bar (100g Proof)</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Draft Revision:</span>
                      <span className="font-mono">v2.1-prepress</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-500">Evaluation Timestamp:</span>
                      <span>{new Date().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Summary Verdict:</span>
                      <span className="font-bold text-amber-600">5 PASS / 1 REVIEW / 1 BLOCKER</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-900">Blockers to resolve before production:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                      <li>MRP prefix declaration missing ('MRP ₹ inclusive of all taxes').</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Document</span>
                  </button>
                  <button
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
