"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Upload, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, Image as ImageIcon, Trash2 } from "lucide-react";
import Navbar from "@/components/ui/Navbar";

const PANELS = [
  {
    key: "front",
    label: "1. Front of Pack",
    desc: "Brand logo, product title, veg/non-veg logo & net quantity",
    icon: "🏷️",
  },
  {
    key: "ingredients",
    label: "2. Ingredient Declaration",
    desc: "Complete ingredient sequence, allergens & vegetable oil types",
    icon: "🌾",
  },
  {
    key: "nutrition",
    label: "3. Nutrition Facts Table",
    desc: "Per 100g / per serving table (energy, sugar, sodium, fats)",
    icon: "📊",
  },
  {
    key: "declaration",
    label: "4. Statutory Declarations",
    desc: "MRP, batch no, date of mfg / expiry & consumer care address",
    icon: "⚖️",
  },
] as const;

export default function NewScan() {
  const [title, setTitle] = useState("");
  const [scanType, setScanType] = useState<"product" | "draft_label">("product");
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(key: string, file: File | undefined) {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [key]: file }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviews((prev) => ({ ...prev, [key]: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveFile(key: string) {
    setFiles((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    setPreviews((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  }

  // Runs the upload pipeline
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const created = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, scan_type: scanType }),
      });

      if (!created.ok) {
        const errJson = await created.json().catch(() => ({}));
        throw new Error(errJson.error ?? "Could not initiate scan record");
      }

      const { id } = await created.json();

      // Upload each panel photo
      for (const p of PANELS) {
        const f = files[p.key];
        if (!f) continue;
        const fd = new FormData();
        fd.append("file", f);
        fd.append("panel", p.key);

        const up = await fetch(`/api/scans/${id}/images`, { method: "POST", body: fd });
        if (!up.ok) {
          const upJson = await up.json().catch(() => ({}));
          throw new Error(`${p.label}: ${upJson.error ?? "photo upload failed"}`);
        }
      }

      // Trigger background extraction job
      fetch(`/api/scans/${id}/extract`, { method: "POST" });

      // Navigate to scan review screen
      window.location.href = `/scan/${id}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const selectedCount = Object.values(files).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Multi-Panel Packaging Capture</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Capture Package for Compliance Scan</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              For highest extraction accuracy under Legal Metrology & FSSAI standards, snap clear flat photos of the 4 panels.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Title & Scan Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name / Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Digestive High Fibre Biscuits 100g"
                  maxLength={120}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-brand-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Scan Classification
                </label>
                <select
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value as any)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-brand-600 focus:outline-none font-medium"
                >
                  <option value="product">Consumer Pack (Commercial)</option>
                  <option value="draft_label">Pre-Print Draft (Manufacturer)</option>
                </select>
              </div>
            </div>

            {/* Panel Capture Cards */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Package Panels (Select at least 1 panel to proceed)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PANELS.map((p) => {
                  const hasFile = !!files[p.key];
                  const preview = previews[p.key];

                  return (
                    <div
                      key={p.key}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        hasFile
                          ? "border-emerald-500 bg-emerald-50/30"
                          : "border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{p.icon}</span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{p.label}</h3>
                            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{p.desc}</p>
                          </div>
                        </div>

                        {hasFile && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ready
                          </span>
                        )}
                      </div>

                      {/* Preview or Upload control */}
                      <div className="mt-3">
                        {preview ? (
                          <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
                            <img src={preview} alt={p.label} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(p.key)}
                              className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-rose-600 text-white rounded-lg transition-colors shadow"
                              title="Remove photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 hover:border-brand-500 rounded-lg cursor-pointer bg-white transition-all group">
                            <div className="flex items-center gap-2 text-slate-500 group-hover:text-brand-700">
                              <Camera className="w-5 h-5" />
                              <span className="text-xs font-semibold">Tap to Take Photo or Browse</span>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1">
                              Rear camera on phones • JPG, PNG, WebP up to 10MB
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => handleFileSelect(p.key, e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {selectedCount === 0
                  ? "Select at least 1 photo panel to upload"
                  : `${selectedCount} panel photo${selectedCount > 1 ? "s" : ""} selected for OCR extraction`}
              </span>

              <button
                type="button"
                disabled={busy || selectedCount === 0}
                onClick={submit}
                className="px-6 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                {busy ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Uploading & Starting OCR…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload & Start Extraction ({selectedCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
