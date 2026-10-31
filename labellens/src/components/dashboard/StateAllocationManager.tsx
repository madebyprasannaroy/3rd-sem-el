"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  ShieldCheck,
  Building2,
  Barcode,
  Hash,
  Sparkles,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Globe,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { DEFAULT_MASTER_TEMPLATES, verifyGeoRouting, type MasterTemplate } from "@/core/antiCounterfeit";

// All 28 States and 8 Union Territories of India
export const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export const REGIONAL_ZONES: Record<string, string[]> = {
  "Pan-India (All 36 States & UTs)": [...INDIAN_STATES_AND_UTS],
  "South Zone": ["Karnataka", "Tamil Nadu", "Telangana", "Andhra Pradesh", "Kerala", "Puducherry"],
  "West Zone": ["Maharashtra", "Gujarat", "Goa", "Rajasthan", "Dadra and Nagar Haveli and Daman and Diu"],
  "North Zone": ["Delhi", "Uttar Pradesh", "Punjab", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Uttarakhand", "Chandigarh", "Ladakh"],
  "East & North-East": ["West Bengal", "Bihar", "Odisha", "Jharkhand", "Assam", "Meghalaya", "Tripura", "Manipur", "Nagaland", "Mizoram", "Arunachal Pradesh", "Sikkim"],
};

export default function StateAllocationManager() {
  const [templates, setTemplates] = useState<MasterTemplate[]>(DEFAULT_MASTER_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_MASTER_TEMPLATES[0].id || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [stateSearch, setStateSearch] = useState("");

  // Editable Form State
  const [brandName, setBrandName] = useState("");
  const [productName, setProductName] = useState("");
  const [officialBarcode, setOfficialBarcode] = useState("");
  const [expectedFssai, setExpectedFssai] = useState("");
  const [batchRegex, setBatchRegex] = useState("");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [citiesInput, setCitiesInput] = useState("");

  // Live Simulation State
  const [simTestCity, setSimTestCity] = useState("Bengaluru");
  const [simTestState, setSimTestState] = useState("Karnataka");

  // Load templates from API or fallback
  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/manufacturer/templates");
      const data = await res.json();
      if (data?.templates && data.templates.length > 0) {
        setTemplates(data.templates);
        selectTemplate(data.templates[0]);
      } else {
        selectTemplate(DEFAULT_MASTER_TEMPLATES[0]);
      }
    } catch {
      selectTemplate(DEFAULT_MASTER_TEMPLATES[0]);
    } finally {
      setIsLoading(false);
    }
  }

  function selectTemplate(tpl: MasterTemplate) {
    setSelectedTemplateId(tpl.id || tpl.official_barcode || tpl.product_name);
    setBrandName(tpl.brand_name || "");
    setProductName(tpl.product_name || "");
    setOfficialBarcode(tpl.official_barcode || "");
    setExpectedFssai(tpl.expected_fssai_license || "");
    setBatchRegex(tpl.allowed_batch_regex || "");
    setSelectedStates(tpl.authorized_states || []);
    setCitiesInput((tpl.authorized_cities || []).join(", "));
    setSaveStatus(null);
  }

  function handleCreateNew() {
    const newTpl: MasterTemplate = {
      id: `new-${Date.now()}`,
      brand_name: brandName || "Brand Name",
      product_name: "New Regional SKU Variant",
      official_barcode: "",
      expected_fssai_license: "",
      allowed_batch_regex: "^[A-Z]{2,4}[0-9]{6}$",
      authorized_states: ["Karnataka"],
      authorized_cities: ["Bengaluru", "Mysuru"],
      golden_extracted_fields: { veg_non_veg: "veg" },
    };
    setTemplates([newTpl, ...templates]);
    selectTemplate(newTpl);
  }

  function toggleState(stateName: string) {
    if (selectedStates.includes(stateName)) {
      setSelectedStates(selectedStates.filter((s) => s !== stateName));
    } else {
      setSelectedStates([...selectedStates, stateName]);
    }
  }

  function applyZonePreset(zoneStates: string[]) {
    // If all zone states are already selected, clear them; otherwise, select all in zone
    const allSelected = zoneStates.every((s) => selectedStates.includes(s));
    if (allSelected) {
      setSelectedStates(selectedStates.filter((s) => !zoneStates.includes(s)));
    } else {
      const merged = Array.from(new Set([...selectedStates, ...zoneStates]));
      setSelectedStates(merged);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveStatus(null);

    const parsedCities = citiesInput
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const payload: MasterTemplate = {
      id: selectedTemplateId,
      brand_name: brandName,
      product_name: productName,
      official_barcode: officialBarcode.trim() || undefined,
      expected_fssai_license: expectedFssai.trim() || undefined,
      allowed_batch_regex: batchRegex.trim() || undefined,
      authorized_states: selectedStates,
      authorized_cities: parsedCities,
      golden_extracted_fields: {},
    };

    try {
      const res = await fetch("/api/manufacturer/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Save failed");
      }

      setSaveStatus("✓ Successfully saved SKU state allocation and master specifications!");
      // Update in local array
      setTemplates((cur) =>
        cur.map((t) =>
          (t.id === selectedTemplateId || (officialBarcode && t.official_barcode === officialBarcode))
            ? { ...t, ...payload }
            : t
        )
      );
    } catch (err: any) {
      setSaveStatus(`Saved locally in session: ${err.message || "Synced"}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 4000);
    }
  }

  // Active Template object for simulation
  const currentWorkingTemplate: MasterTemplate = {
    brand_name: brandName,
    product_name: productName,
    official_barcode: officialBarcode,
    expected_fssai_license: expectedFssai,
    allowed_batch_regex: batchRegex,
    authorized_states: selectedStates,
    authorized_cities: citiesInput.split(",").map((c) => c.trim()).filter(Boolean),
    golden_extracted_fields: {},
  };

  // Run live simulation on user test location
  const simResult = verifyGeoRouting(
    { city: simTestCity.trim() || undefined, state: simTestState.trim() || undefined },
    currentWorkingTemplate
  );

  const filteredStates = INDIAN_STATES_AND_UTS.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 text-xs font-semibold mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>State Allocation & Supply-Chain Territory Controls</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            SKU Geographic & State Distribution Manager
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Designate authorized states, statutory FSSAI state-plant licenses, and batch regex rules for specific SKUs to automatically prevent cross-border gray-market diversion and knock-offs.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add Regional SKU</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: SKU Selector & Template List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-700" />
                <span>Registered SKUs ({templates.length})</span>
              </span>
              <button
                onClick={fetchTemplates}
                className="text-xs text-slate-500 hover:text-slate-800 p-1 rounded"
                title="Refresh master templates"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {templates.map((tpl) => {
                const isSelected =
                  selectedTemplateId === (tpl.id || tpl.official_barcode || tpl.product_name);
                const stateCount = tpl.authorized_states?.length || 0;
                const isPanIndia = stateCount >= 30;

                return (
                  <button
                    key={tpl.id || tpl.official_barcode || tpl.product_name}
                    onClick={() => selectTemplate(tpl)}
                    className={`w-full text-left p-4 transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? "bg-brand-50/80 border-l-4 border-l-brand-600"
                        : "hover:bg-slate-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                        {tpl.brand_name}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {tpl.product_name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <Barcode className="w-3 h-3 text-slate-400" />
                        <span>{tpl.official_barcode || "No Barcode"}</span>
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {isPanIndia
                            ? "Pan-India Authorized"
                            : stateCount > 0
                            ? `${stateCount} States Allocated`
                            : "All Territories"}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? "text-brand-700 translate-x-0.5" : "text-slate-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Geo-Routing Diversion Sandbox Tester */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-sm border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Live Geo Diversion Simulation
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Test how the AI Engine flags a physical scan event for this SKU in any Indian state or city:
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase">
                  Test Scan State:
                </label>
                <select
                  value={simTestState}
                  onChange={(e) => setSimTestState(e.target.value)}
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 mt-0.5"
                >
                  {INDIAN_STATES_AND_UTS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-300 uppercase">
                  Test Scan City:
                </label>
                <input
                  type="text"
                  value={simTestCity}
                  onChange={(e) => setSimTestCity(e.target.value)}
                  placeholder="e.g. Bengaluru, Patna, Mumbai"
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 mt-0.5"
                />
              </div>
            </div>

            {/* Simulation Feedback Card */}
            <div
              className={`p-3 rounded-xl border text-xs leading-snug font-medium transition-all ${
                simResult
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {simResult ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>DIVERSION DETECTED (FRAUD BLOCKED)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>AUTHORIZED DISTRIBUTION ZONE</span>
                  </>
                )}
              </div>
              <p className="text-[11px] opacity-90">
                {simResult
                  ? simResult.description
                  : `Scan in ${simTestCity || "specified location"}, ${simTestState} is valid and cleared within this SKU's authorized territory.`}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: SKU Configuration & Interactive State Selector */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Master Specification
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                  {productName || "Regional SKU Specification"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save SKU Allocation</span>
                </button>
              </div>
            </div>

            {saveStatus && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveStatus}</span>
              </div>
            )}

            {/* Core SKU Identifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Britannia, Lay's, Amul"
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product / SKU Title
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. NutriChoice Digestive (Karnataka Pack)"
                  className="w-full text-xs font-semibold border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Barcode className="w-3.5 h-3.5 text-slate-500" />
                  <span>Official EAN-13 Barcode</span>
                </label>
                <input
                  type="text"
                  value={officialBarcode}
                  onChange={(e) => setOfficialBarcode(e.target.value)}
                  placeholder="e.g. 8901063142213"
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>State Plant FSSAI License (14 Digits)</span>
                </label>
                <input
                  type="text"
                  value={expectedFssai}
                  onChange={(e) => setExpectedFssai(e.target.value)}
                  placeholder="e.g. 10015043001129"
                  maxLength={14}
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Batch Coding Pattern Builder */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>Inkjet Batch Pattern (Regular Expression)</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Enforces state-coded plant codes
                </span>
              </div>

              <input
                type="text"
                value={batchRegex}
                onChange={(e) => setBatchRegex(e.target.value)}
                placeholder="e.g. ^(BRT-KA|NT-KA)[0-9]{6}$"
                className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-600 focus:outline-none"
              />

              {/* State Code Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-500 font-medium">Quick state prefixes:</span>
                {[
                  { label: "KA (Karnataka)", prefix: "^(BRT-KA|NT)[0-9]{6}$" },
                  { label: "MH (Maharashtra)", prefix: "^(BRT-MH|NT)[0-9]{6}$" },
                  { label: "DL (Delhi)", prefix: "^(BRT-DL|NT)[0-9]{6}$" },
                  { label: "TN (Tamil Nadu)", prefix: "^(BRT-TN|NT)[0-9]{6}$" },
                  { label: "WB (West Bengal)", prefix: "^(BRT-WB|NT)[0-9]{6}$" },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setBatchRegex(preset.prefix)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Authorized States Multi-Select & Zone Presets */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Authorized Distribution States & Union Territories</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Scans outside these selected states trigger an interstate diversion alert.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {selectedStates.length} of {INDIAN_STATES_AND_UTS.length} Selected
                  </span>
                </div>
              </div>

              {/* Regional Zone Presets */}
              <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  Zone Presets:
                </span>
                {Object.entries(REGIONAL_ZONES).map(([zoneName, zoneStates]) => {
                  const isFullySelected = zoneStates.every((s) => selectedStates.includes(s));
                  return (
                    <button
                      key={zoneName}
                      type="button"
                      onClick={() => applyZonePreset(zoneStates)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isFullySelected
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {zoneName}
                    </button>
                  );
                })}
              </div>

              {/* Search States Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter state (e.g. Karnataka, Maharashtra, Delhi)..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
              </div>

              {/* Interactive State Chips Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                {filteredStates.map((st) => {
                  const isSelected = selectedStates.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleState(st)}
                      className={`p-2 rounded-xl text-left text-xs font-semibold border transition-all flex items-center justify-between gap-1.5 ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{st}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Authorized Regional Hubs / Cities */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Authorized Distribution Hubs / Cities (Comma Separated)
              </label>
              <input
                type="text"
                value={citiesInput}
                onChange={(e) => setCitiesInput(e.target.value)}
                placeholder="e.g. Bengaluru, Mysuru, Hubballi, Mangaluru, Belagavi"
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Leave empty if entire state(s) are authorized without specific city filters.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
