"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Barcode,
  Hash,
  FileCheck2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Navigation,
} from "lucide-react";
import type { CounterfeitAssessment, AnomalyFlag, FlagSeverity } from "@/core/antiCounterfeit";

interface AntiCounterfeitShieldProps {
  assessment?: CounterfeitAssessment | null;
  scanId: string;
  onRefresh?: (context?: { city?: string; barcode?: string; batchNumber?: string }) => Promise<void>;
}

export default function AntiCounterfeitShield({
  assessment,
  scanId,
  onRefresh,
}: AntiCounterfeitShieldProps) {
  const [expanded, setExpanded] = useState(true);
  const [showSimulateGeo, setShowSimulateGeo] = useState(false);
  const [testCity, setTestCity] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);

  if (!assessment) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Anti-Counterfeit Protection
            </h3>
            <p className="text-xs text-slate-500">
              Cross-referencing live label extraction against manufacturer master templates...
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh()}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Assess Now</span>
          </button>
        )}
      </div>
    );
  }

  const { authenticity_score, verdict, flags, checks, matched_brand } = assessment;
  const scorePercent = Math.round(authenticity_score * 100);

  // Verdict visual configurations
  const isAuthentic = verdict === "AUTHENTIC";
  const isSuspected = verdict === "SUSPECTED_FAKE";
  const isCritical = verdict === "CRITICAL_COUNTERFEIT_RISK";

  const verdictConfig = {
    AUTHENTIC: {
      title: "Genuine Brand Verification Passed",
      subtitle: "Packaging parameters align with manufacturer master specifications.",
      bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-950",
      badgeBg: "bg-emerald-600 text-white",
      barColor: "bg-emerald-500",
      icon: ShieldCheck,
      iconColor: "text-emerald-600",
      accentBg: "bg-emerald-100/70 border-emerald-200",
    },
    SUSPECTED_FAKE: {
      title: "Suspected Counterfeit / Packaging Anomaly",
      subtitle: "One or more critical identifiers diverge from verified brand templates.",
      bg: "bg-amber-500/10 border-amber-500/30 text-amber-950",
      badgeBg: "bg-amber-600 text-white",
      barColor: "bg-amber-500",
      icon: ShieldAlert,
      iconColor: "text-amber-600",
      accentBg: "bg-amber-100/70 border-amber-200",
    },
    CRITICAL_COUNTERFEIT_RISK: {
      title: "CRITICAL COUNTERFEIT RISK - DO NOT CONSUME",
      subtitle: "Multiple severe fraud indicators detected (licensing, formula, or trademark spoof).",
      bg: "bg-rose-500/10 border-rose-500/30 text-rose-950",
      badgeBg: "bg-rose-600 text-white",
      barColor: "bg-rose-600",
      icon: ShieldX,
      iconColor: "text-rose-600",
      accentBg: "bg-rose-100/70 border-rose-200",
    },
  }[verdict];

  const VerdictIcon = verdictConfig.icon;

  const handleSimulateGeo = async (city: string) => {
    if (!onRefresh) return;
    setIsSimulating(true);
    try {
      await onRefresh({ city });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className={`rounded-2xl border transition-all shadow-sm overflow-hidden ${verdictConfig.bg}`}>
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${verdictConfig.accentBg}`}>
            <VerdictIcon className={`w-7 h-7 ${verdictConfig.iconColor}`} />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide ${verdictConfig.badgeBg}`}>
                {verdict.replace(/_/g, " ")}
              </span>
              {matched_brand && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70 border border-slate-200/60 text-slate-700">
                  Brand Spec: <strong>{matched_brand}</strong>
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {verdictConfig.title}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {verdictConfig.subtitle}
            </p>
          </div>
        </div>

        {/* Score Radial / Progress Bar */}
        <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {scorePercent}%
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Authenticity Score
            </div>
            <div className="w-28 h-2 bg-slate-200 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full ${verdictConfig.barColor} transition-all duration-500`}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-slate-600 transition-colors border border-slate-200/60"
            title={expanded ? "Collapse verification breakdown" : "Expand breakdown"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Breakdown */}
      {expanded && (
        <div className="border-t border-slate-200/60 bg-white/60 p-4 sm:p-5 space-y-5">
          {/* Subsystem 6-Pillar Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Packaging Integrity & Statutory Audit Checks</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Brand Trademark */}
              <CheckCard
                icon={FileCheck2}
                label="Brand Trademark"
                status={checks.brandCheck.status}
                detail={checks.brandCheck.details}
              />

              {/* 2. FSSAI Statutory License */}
              <CheckCard
                icon={Hash}
                label="FSSAI License # (14-Digit)"
                status={checks.fssaiCheck.status}
                detail={checks.fssaiCheck.details}
              />

              {/* 3. Barcode / EAN-13 Checksum */}
              <CheckCard
                icon={Barcode}
                label="EAN-13 / GS1 Barcode"
                status={checks.barcodeCheck.status}
                detail={checks.barcodeCheck.details}
              />

              {/* 4. Batch Code Regular Expression */}
              <CheckCard
                icon={Hash}
                label="Inkjet Batch Format"
                status={checks.batchCheck.status}
                detail={checks.batchCheck.details}
              />

              {/* 5. Geo-Routing & Supply Chain Integrity */}
              <CheckCard
                icon={MapPin}
                label="Geo-Routing Distribution"
                status={checks.geoCheck.status}
                detail={checks.geoCheck.details}
                actionLabel="Simulate City"
                onAction={() => setShowSimulateGeo(!showSimulateGeo)}
              />

              {/* 6. Formula & Golden Fields Consistency */}
              <CheckCard
                icon={FileCheck2}
                label="Golden Formula Alignment"
                status={checks.formulaCheck.status}
                detail={checks.formulaCheck.details}
              />
            </div>
          </div>

          {/* Interactive Geo-Routing Simulation Drawer */}
          {showSimulateGeo && onRefresh && (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">Simulate Scan City / Supply Chain Node</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Tests unauthorized supply chain diversion
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter city (e.g. Patna, Ranchi, Bengaluru, Mumbai)"
                  value={testCity}
                  onChange={(e) => setTestCity(e.target.value)}
                  className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-brand-500 flex-1 min-w-[200px]"
                />
                <button
                  onClick={() => handleSimulateGeo(testCity)}
                  disabled={!testCity || isSimulating}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {isSimulating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                  <span>Test Geo Diversion</span>
                </button>
              </div>

              {/* Quick sample chips */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>Quick tests:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTestCity("Bengaluru");
                    handleSimulateGeo("Bengaluru");
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Bengaluru (Authorized)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestCity("Patna");
                    handleSimulateGeo("Patna");
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-medium"
                >
                  Patna (Diversion)
                </button>
              </div>
            </div>
          )}

          {/* Anomaly Flags List */}
          {flags.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Detected Discrepancies & Counterfeit Flags ({flags.length})</span>
              </h4>

              <div className="space-y-2">
                {flags.map((flag, idx) => (
                  <FlagItem key={`${flag.code}-${idx}`} flag={flag} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckCard({
  icon: Icon,
  label,
  status,
  detail,
  actionLabel,
  onAction,
}: {
  icon: any;
  label: string;
  status: "passed" | "warning" | "failed" | "not_checked";
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const statusStyles = {
    passed: {
      border: "border-emerald-200 bg-emerald-50/70",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      badgeText: "VERIFIED",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
    },
    warning: {
      border: "border-amber-200 bg-amber-50/70",
      badge: "bg-amber-100 text-amber-900 border-amber-300",
      badgeText: "WARNING",
      icon: AlertTriangle,
      iconColor: "text-amber-600",
    },
    failed: {
      border: "border-rose-200 bg-rose-50/70",
      badge: "bg-rose-100 text-rose-900 border-rose-300",
      badgeText: "FAILED",
      icon: XCircle,
      iconColor: "text-rose-600",
    },
    not_checked: {
      border: "border-slate-200 bg-slate-50/70",
      badge: "bg-slate-100 text-slate-600 border-slate-300",
      badgeText: "UNTESTED",
      icon: Info,
      iconColor: "text-slate-400",
    },
  }[status];

  const StatusIcon = statusStyles.icon;

  return (
    <div className={`p-3.5 rounded-xl border transition-all ${statusStyles.border}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-xs font-bold text-slate-900">{label}</span>
        </div>
        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border ${statusStyles.badge}`}>
          {statusStyles.badgeText}
        </span>
      </div>

      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
        {detail}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 text-[10px] font-bold text-brand-700 hover:text-brand-900 underline flex items-center gap-1"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

function FlagItem({ flag }: { flag: AnomalyFlag }) {
  const severityBadge = {
    CRITICAL: "bg-rose-700 text-white",
    HIGH: "bg-rose-100 text-rose-900 border border-rose-300",
    MEDIUM: "bg-amber-100 text-amber-900 border border-amber-300",
    LOW: "bg-slate-100 text-slate-700 border border-slate-300",
  }[flag.severity];

  return (
    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-xs space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded ${severityBadge}`}>
            {flag.severity}
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-700">
            [{flag.code}]
          </span>
        </div>
      </div>

      <p className="font-medium text-slate-900">
        {flag.description}
      </p>

      {(flag.expected || flag.detected) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 mt-1 border-t border-slate-100">
          {flag.expected && (
            <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
              <span className="text-slate-400 font-semibold block text-[10px]">EXPECTED SPEC:</span>
              <span className="font-mono text-slate-700 break-words">{flag.expected}</span>
            </div>
          )}
          {flag.detected && (
            <div className="bg-rose-50/50 p-1.5 rounded border border-rose-200">
              <span className="text-rose-500 font-semibold block text-[10px]">DETECTED ON PACK:</span>
              <span className="font-mono text-rose-900 font-bold break-words">{flag.detected}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

