"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Upload, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, Trash2, Layers, Scan } from "lucide-react";
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

/** Convert a File to base64 string */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix: "data:image/jpeg;base64,..."
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewScan() {
  const [mode, setMode] = useState<"quick" | "multi">("multi");
  const [title, setTitle] = useState("");
  const [scanType, setScanType] = useState<"product" | "draft_label">("product");
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [scanStage, setScanStage] = useState<string | null>(null);
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

  async function submit() {
    setBusy(true);
    setError(null);
    setScanStage("Preparing images for upload...");

    try {
      // Determine which keys have files
      const activeKeys = mode === "quick" ? ["full_pack"] : PANELS.map((p) => p.key);
      const filledEntries: { panel: string; file: File }[] = [];
      for (const key of activeKeys) {
        const f = files[key];
        if (f) filledEntries.push({ panel: key, file: f });
      }

      if (filledEntries.length === 0) {
        throw new Error("Please attach at least 1 packaging photo.");
      }

      const scanId = `scan-${Date.now()}`;

      // Convert all files to base64
      setScanStage("Encoding images...");
      const imagePayloads: { panel: string; base64: string; mimeType: string }[] = [];
      for (const entry of filledEntries) {
        const base64 = await fileToBase64(entry.file);
        imagePayloads.push({
          panel: entry.panel,
          base64,
          mimeType: entry.file.type || "image/jpeg",
        });
      }

      // Also save preview URLs to localStorage for the review page
      const photoData: { panel: string; dataUrl: string }[] = [];
      for (const entry of filledEntries) {
        const key = entry.panel;
        if (previews[key]) {
          photoData.push({ panel: key, dataUrl: previews[key] });
        }
      }

      setScanStage("Running Gemini Vision OCR extraction...");

      const directRes = await fetch("/api/extract-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imagePayloads,
          title: title.trim() || undefined,
        }),
      });

      const extractionData = await directRes.json().catch(() => null);

      if (!directRes.ok || !extractionData?.ok) {
        const errorMsg = extractionData?.error || `Extraction failed with HTTP status ${directRes.status}`;
        throw new Error(errorMsg);
      }

      setScanStage("Preparing scan review...");

      const resolvedTitle =
        title.trim() ||
        extractionData.product_summary?.product_name ||
        "New Package Scan";

      // Store ONLY genuine extracted fields and image data in localStorage
      const scanData = {
        id: scanId,
        title: resolvedTitle,
        scanType,
        status: "needs_review",
        createdAt: new Date().toISOString(),
        extraction: {
          detected_panels: extractionData.detected_panels || [],
          product_summary: extractionData.product_summary || null,
          fields: extractionData.fields || [],
        },
        photos: photoData,
      };

      localStorage.setItem(`labellens_scan_${scanId}`, JSON.stringify(scanData));

      // Also store in a scan list for the dashboard
      const scanList = JSON.parse(localStorage.getItem("labellens_scan_list") || "[]");
      scanList.unshift({
        id: scanId,
        title: scanData.title,
        status: "needs_review",
        createdAt: scanData.createdAt,
        panelCount: filledEntries.length,
      });
      localStorage.setItem("labellens_scan_list", JSON.stringify(scanList));

      await new Promise((r) => setTimeout(r, 400));

      // Navigate to scan review screen
      window.location.href = `/scan/${scanId}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setScanStage(null);
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
              <span>Unified Gemini Vision Packaging Extraction</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Capture Package for Compliance Scan</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              For highest extraction accuracy under Legal Metrology & FSSAI standards, snap clear flat photos of the 4 panels.
            </p>

            {/* Mode Switcher Tabs */}
            <div className="mt-5 flex gap-2 border-b border-slate-800 pb-1">
              <button
                type="button"
                onClick={() => setMode("quick")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  mode === "quick"
                    ? "bg-brand-700 text-white shadow-md ring-1 ring-brand-500"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Scan className="w-4 h-4 text-emerald-400" />
                <span>Quick Single Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("multi")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  mode === "multi"
                    ? "bg-brand-700 text-white shadow-md ring-1 ring-brand-500"
                    : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Multi-Panel (4 Panels)</span>
              </button>
            </div>
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
                  placeholder="e.g. Lay's India's Magic Masala or Digestive Biscuits"
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

            {/* Quick Single Photo Mode */}
            {mode === "quick" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Take or Upload Full Pack Photo</h3>
                    <p className="text-xs text-slate-500">
                      Gemini Vision automatically reads front identity, ingredients, nutrition table, and declarations from a single image.
                    </p>
                  </div>
                  {files["full_pack"] && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Image Attached
                    </span>
                  )}
                </div>

                {previews["full_pack"] ? (
                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner max-h-[380px]">
                    <img src={previews["full_pack"]} alt="Pack photo" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile("full_pack")}
                      className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-rose-600 text-white rounded-xl transition-colors shadow-lg"
                      title="Remove photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-brand-50/30 transition-all group">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-brand-700 group-hover:border-brand-400 group-hover:scale-105 transition-all mb-3">
                      <Camera className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-brand-900">
                      Tap to Take Photo or Browse Pack Image
                    </span>
                    <span className="text-xs text-slate-500 mt-1 text-center max-w-sm">
                      Rear camera on mobile • JPG, PNG, WebP up to 8MB. Even a single front or back photo will extract visible fields!
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFileSelect("full_pack", e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Multi-Panel Capture Cards Mode */}
            {mode === "multi" && (
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
            )}

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Scan Progress Stage Indicator */}
            {busy && scanStage && (
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin shrink-0" />
                <span className="font-medium">{scanStage}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                {selectedCount === 0
                  ? "Attach at least 1 packaging photo to scan"
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
                    <span>{scanStage || "Processing..."}</span>
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
