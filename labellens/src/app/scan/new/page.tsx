"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Layers,
  Scan,
  ShieldCheck,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  const [scanCity, setScanCity] = useState("Bengaluru");
  const [manualBarcode, setManualBarcode] = useState("");
  const [manualBatch, setManualBatch] = useState("");
  const [showAntiCounterfeitOptions, setShowAntiCounterfeitOptions] = useState(false);
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [scanStage, setScanStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-detect scanType from URL query params (e.g. ?type=draft_label from Manufacturer portal)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const type = params.get("type");
      if (type === "draft_label" || type === "draft" || type === "manufacturer") {
        setScanType("draft_label");
      } else if (type === "product") {
        setScanType("product");
      }
    }
  }, []);

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
    setScanStage("Preparing packaging images...");

    try {
      const activeKeys = mode === "quick" ? ["full_pack"] : PANELS.map((p) => p.key);
      const filledEntries: { panel: string; file: File }[] = [];
      for (const key of activeKeys) {
        const f = files[key];
        if (f) filledEntries.push({ panel: key, file: f });
      }

      if (filledEntries.length === 0) {
        throw new Error("Please attach at least 1 packaging photo to start scanning.");
      }

      const scanId = `scan-${Date.now()}`;

      setScanStage("Encoding images for OCR inspection...");
      const imagePayloads: { panel: string; base64: string; mimeType: string }[] = [];
      for (const entry of filledEntries) {
        const base64 = await fileToBase64(entry.file);
        imagePayloads.push({
          panel: entry.panel,
          base64,
          mimeType: entry.file.type || "image/jpeg",
        });
      }

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
          scanType,
          barcode: manualBarcode.trim() || undefined,
          batchNumber: manualBatch.trim() || undefined,
          geoLocation: scanCity.trim() ? { city: scanCity.trim() } : undefined,
        }),
      });

      const extractionData = await directRes.json().catch(() => null);

      if (!directRes.ok || !extractionData?.ok) {
        let rawError = extractionData?.error || `Extraction failed with HTTP status ${directRes.status}`;
        try {
          if (typeof rawError === "string" && rawError.trim().startsWith("{")) {
            const parsed = JSON.parse(rawError);
            if (parsed?.error?.message) rawError = parsed.error.message;
          }
        } catch {}
        throw new Error(rawError);
      }

      setScanStage("Compiling verification dossier...");

      const finalScanId = extractionData?.scan_id || scanId;

      const resolvedTitle =
        title.trim() ||
        extractionData.product_summary?.product_name ||
        "New Package Scan";

      const scanData = {
        id: finalScanId,
        title: resolvedTitle,
        scanType,
        status: "needs_review",
        createdAt: new Date().toISOString(),
        anti_counterfeit: extractionData.anti_counterfeit || null,
        extraction: {
          detected_panels: extractionData.detected_panels || [],
          product_summary: extractionData.product_summary || null,
          fields: extractionData.fields || [],
          anti_counterfeit: extractionData.anti_counterfeit || null,
        },
        photos: photoData,
      };

      localStorage.setItem(`labellens_scan_${finalScanId}`, JSON.stringify(scanData));

      const scanList = JSON.parse(localStorage.getItem("labellens_scan_list") || "[]");
      scanList.unshift({
        id: finalScanId,
        title: scanData.title,
        status: "needs_review",
        createdAt: scanData.createdAt,
        panelCount: filledEntries.length,
      });
      localStorage.setItem("labellens_scan_list", JSON.stringify(scanList));

      await new Promise((r) => setTimeout(r, 400));
      window.location.href = `/scan/${finalScanId}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setScanStage(null);
    }
  }

  const selectedCount = Object.values(files).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-950/40 text-slate-100 flex flex-col relative font-tenor">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-eucalyptus hover:text-clay transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Main Card Wrapper — Ivory surface with Clay & Eucalyptus accents */}
        <div className="rounded-3xl border-2 border-eucalyptus/60 bg-ivory text-slate-900 shadow-2xl overflow-hidden ring-1 ring-clay/30">
          {/* Card Header — Slate-950 with Clay top border and Inspector-aligned accents */}
          <div className="p-6 sm:p-8 bg-slate-950 text-ivory border-b-2 border-eucalyptus relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-clay via-peach to-eucalyptus" />

            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-clay/20 text-peach border border-clay/40">
                <Sparkles className="w-3.5 h-3.5 text-clay" />
                <span>
                  {scanType === "draft_label"
                    ? "Pre-Print Pre-Press Audit • Legal Metrology 1:1 Scale Proof"
                    : "Multimodal Vision OCR • India Edition"}
                </span>
              </span>
              <span className="text-[11px] text-eucalyptus uppercase tracking-wider font-semibold hidden sm:inline">
                {scanType === "draft_label"
                  ? "Pre-Cylinder Engraving Proof"
                  : "FSSAI & Legal Metrology"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ivory">
              {scanType === "draft_label"
                ? "Pre-Print Artwork Audit & Proof Verification"
                : "Capture Package for Compliance Scan"}
            </h1>
            <p className="text-xs sm:text-sm text-eucalyptus/90 mt-1.5 max-w-2xl leading-relaxed">
              {scanType === "draft_label"
                ? "Upload flat pre-press digital artwork, packaging mechanicals, or proofs. Evaluates true 1:1 scale font heights (Legal Metrology Rules 2011), veg/non-veg surface area ratios, and statutory allergen warnings before plates and cylinders go to production."
                : "Snap clear, flat photos of the package panels. LabelLens extracts mandatory regulatory declarations, verifies barcode & batch numbers, and cross-checks nutritional standards."}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="mt-6 flex flex-wrap gap-2.5 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setMode("quick")}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  mode === "quick"
                    ? "bg-clay text-slate-950 shadow-md shadow-clay/20 ring-2 ring-peach/60"
                    : "bg-slate-900/80 text-eucalyptus hover:bg-slate-800 hover:text-ivory border border-eucalyptus/30"
                }`}
              >
                <Scan className="w-4 h-4 text-slate-950" />
                <span>Quick Single Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("multi")}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  mode === "multi"
                    ? "bg-clay text-slate-950 shadow-md shadow-clay/20 ring-2 ring-peach/60"
                    : "bg-slate-900/80 text-eucalyptus hover:bg-slate-800 hover:text-ivory border border-eucalyptus/30"
                }`}
              >
                <Layers className="w-4 h-4 text-slate-950" />
                <span>Multi-Panel Breakdown (4 Panels)</span>
              </button>
            </div>
          </div>

          {/* Form Content Area */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Title & Classification Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  Product Name / Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lay's India's Magic Masala or NutriChoice Digestive"
                  maxLength={120}
                  className="w-full text-sm border-2 border-eucalyptus rounded-xl p-3 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none transition-all shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                  Scan Classification
                </label>
                <select
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value as any)}
                  className="w-full text-sm border-2 border-eucalyptus rounded-xl p-3 bg-white text-slate-900 focus:ring-2 focus:ring-clay focus:border-clay focus:outline-none font-semibold transition-all shadow-sm"
                >
                  <option value="product">Consumer Pack (Commercial)</option>
                  <option value="draft_label">Pre-Print Draft (Manufacturer)</option>
                </select>
              </div>
            </div>

            {scanType === "draft_label" && (
              <div className="rounded-xl border border-blue-300 bg-blue-50/80 p-3.5 text-xs text-blue-950 flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                  <span>
                    <strong>1:1 Flat Artwork Scale Mode Active:</strong> Calibrated for pre-press mechanical proofs, digital PDF/PNG layouts, and flat mockups. Font heights (Legal Metrology Rules 2011) and display proportions are checked directly against artwork specifications without camera perspective distortion.
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-blue-600 text-white shrink-0">
                  Pre-Print Audit
                </span>
              </div>
            )}

            {/* Anti-Counterfeit & Supply Chain Routing Options (Collapsible) */}
            <div className="rounded-2xl border-2 border-eucalyptus bg-pistachio/45 p-4 space-y-3 transition-all shadow-sm">
              <button
                type="button"
                onClick={() => setShowAntiCounterfeitOptions(!showAntiCounterfeitOptions)}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-900 hover:text-clay transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-clay" />
                  <span>Anti-Counterfeit & Geo-Routing Parameters (Optional)</span>
                </span>
                <span className="text-slate-600 font-medium text-[11px] flex items-center gap-1">
                  {showAntiCounterfeitOptions ? "Hide" : "Configure City / Barcode / Batch"}
                  {showAntiCounterfeitOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {showAntiCounterfeitOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-eucalyptus">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-600" />
                      <span>Scan Location / City</span>
                    </label>
                    <input
                      type="text"
                      value={scanCity}
                      onChange={(e) => setScanCity(e.target.value)}
                      placeholder="e.g. Bengaluru, Mumbai, Delhi"
                      className="w-full text-xs border border-eucalyptus rounded-lg p-2.5 bg-white text-slate-900 focus:ring-1 focus:ring-clay focus:border-clay focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Detects gray-market geo diversion
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Physical Barcode (EAN-13)
                    </label>
                    <input
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      placeholder="e.g. 8901063142213"
                      className="w-full text-xs border border-eucalyptus rounded-lg p-2.5 bg-white text-slate-900 focus:ring-1 focus:ring-clay focus:border-clay focus:outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Optional if visible on photos
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 mb-1">
                      Inkjet Batch Number
                    </label>
                    <input
                      type="text"
                      value={manualBatch}
                      onChange={(e) => setManualBatch(e.target.value)}
                      placeholder="e.g. BRT202409A"
                      className="w-full text-xs border border-eucalyptus rounded-lg p-2.5 bg-white text-slate-900 focus:ring-1 focus:ring-clay focus:border-clay focus:outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Cross-referenced against brand regex
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Single Photo Mode */}
            {mode === "quick" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Take or Upload Full Pack Photo</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Gemini Vision automatically reads front identity, ingredients, nutrition table, and declarations from a single photo.
                    </p>
                  </div>
                  {files["full_pack"] && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-950 bg-clay px-3 py-1 rounded-full shrink-0 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Image Attached
                    </span>
                  )}
                </div>

                {previews["full_pack"] ? (
                  <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-eucalyptus shadow-inner max-h-[380px]">
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
                  <label className="flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed border-eucalyptus hover:border-clay rounded-2xl cursor-pointer bg-white/90 hover:bg-pistachio/50 transition-all group shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-pistachio border border-eucalyptus flex items-center justify-center text-slate-800 group-hover:text-clay group-hover:scale-105 transition-all mb-3 shadow-sm">
                      <Camera className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 group-hover:text-clay transition-colors">
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
                <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                  Package Panels (Select at least 1 panel to proceed)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {PANELS.map((p) => {
                    const hasFile = !!files[p.key];
                    const preview = previews[p.key];

                    return (
                      <div
                        key={p.key}
                        className={`p-5 rounded-2xl border-2 transition-all duration-200 ${
                          hasFile
                            ? "border-clay bg-pistachio/80 shadow-md ring-1 ring-clay/40"
                            : "border-eucalyptus bg-white hover:bg-pistachio/40 hover:border-clay/60 shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{p.icon}</span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{p.label}</h3>
                              <p className="text-[11px] text-slate-600 leading-tight mt-0.5">{p.desc}</p>
                            </div>
                          </div>

                          {hasFile && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-950 bg-clay px-2.5 py-0.5 rounded-full shrink-0 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready
                            </span>
                          )}
                        </div>

                        {/* Preview or Upload control */}
                        <div className="mt-3.5">
                          {preview ? (
                            <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-950 border border-eucalyptus shadow-sm">
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
                            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-eucalyptus hover:border-clay rounded-xl cursor-pointer bg-white/90 hover:bg-pistachio/60 transition-all group">
                              <div className="flex items-center gap-2 text-slate-700 group-hover:text-clay">
                                <Camera className="w-5 h-5" />
                                <span className="text-xs font-bold">Tap to Take Photo or Browse</span>
                              </div>
                              <span className="text-[10px] text-slate-500 mt-1">
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
              <div className="p-4 rounded-xl bg-peach border-2 border-clay text-slate-900 text-xs flex items-center gap-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-clay" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Scan Progress Stage Indicator */}
            {busy && scanStage && (
              <div className="p-4 rounded-xl bg-pistachio border-2 border-eucalyptus text-slate-900 text-xs flex items-center gap-2.5 shadow-sm">
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin shrink-0" />
                <span className="font-semibold">{scanStage}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-5 border-t-2 border-eucalyptus/60 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-700 font-medium">
                {selectedCount === 0
                  ? "Attach at least 1 packaging photo to scan"
                  : `${selectedCount} panel photo${selectedCount > 1 ? "s" : ""} selected for OCR extraction`}
              </span>

              <button
                type="button"
                disabled={busy || selectedCount === 0}
                onClick={submit}
                className="px-7 py-3 rounded-xl bg-clay hover:bg-[#c98f65] active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-clay/25 transition-all flex items-center gap-2.5 border border-clay/60 cursor-pointer"
              >
                {busy ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>{scanStage || "Processing..."}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-slate-950" />
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
