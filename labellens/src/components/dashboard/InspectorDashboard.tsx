"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Scale, History, KeyRound, AlertCircle, CheckCircle2, ChevronRight, Lock, Eye, Edit3, Activity } from "lucide-react";
import type { ScanRow } from "@/components/LiveScanList";
import LiveScanList from "@/components/LiveScanList";

interface AuditEvent {
  id: number;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: any;
  created_at: string;
}

interface RuleItem {
  id: string;
  name: string;
  legal_source: string;
  category: string;
  status: string;
  version: string;
  effective_from: string;
  severity: string;
  description: string;
  last_modified_by: string;
}

export default function InspectorDashboard({ initialScans }: { initialScans: ScanRow[] }) {
  const [activeTab, setActiveTab] = useState<"live-feed" | "rules" | "audit">("live-feed");
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false);
  const [targetRule, setTargetRule] = useState<RuleItem | null>(null);
  const [password, setPassword] = useState("");
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stepUpSuccess, setStepUpSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Fetch rules
    fetch("/api/rulesets")
      .then((res) => res.json())
      .then((data) => {
        if (data.rules) setRules(data.rules);
      })
      .catch((err) => console.error("Error loading rules:", err));

    // Fetch audit events
    fetch("/api/audit")
      .then((res) => res.json())
      .then((data) => {
        if (data.events) setAuditEvents(data.events);
      })
      .catch((err) => console.error("Error loading audit events:", err));
  }, []);

  async function handleStepUpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetRule) return;

    setSubmitting(true);
    setStepUpError(null);
    setStepUpSuccess(null);

    try {
      const res = await fetch("/api/rulesets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleId: targetRule.id,
          stepUpPassword: password,
          updateData: {
            description: `${targetRule.description} [Amended with stricter verification standards]`,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Step-up authorization failed");
      }

      setStepUpSuccess(`Successfully authenticated step-up! Rule ${targetRule.id} draft revision created.`);
      setPassword("");
      // Refresh rules
      const refreshed = await fetch("/api/rulesets").then((r) => r.json());
      if (refreshed.rules) setRules(refreshed.rules);

      setTimeout(() => {
        setStepUpModalOpen(false);
        setStepUpSuccess(null);
      }, 1500);
    } catch (err) {
      setStepUpError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Inspector Authority Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 rounded-2xl p-6 text-white shadow-lg border border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold mb-2">
            <Scale className="w-3.5 h-3.5" />
            <span>Statutory Enforcement & Legal Metrology Oversight</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Inspector Governance Center</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Live pan-India scan surveillance, rule version governance with step-up cryptographic challenge, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-right">
            <span className="text-[11px] text-slate-400 block font-mono">Surveillance Status</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live WebSocket Active
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("live-feed")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "live-feed"
              ? "border-amber-600 text-amber-900 bg-amber-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Pan-System Live Scan Feed</span>
          <span className="text-xs bg-slate-200 px-1.5 py-0.2 rounded-full text-slate-700">{initialScans.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "rules"
              ? "border-amber-600 text-amber-900 bg-amber-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Rule Governance & Legal Sources</span>
          <span className="text-xs bg-slate-200 px-1.5 py-0.2 rounded-full text-slate-700">{rules.length}</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "audit"
              ? "border-amber-600 text-amber-900 bg-amber-50/50"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Immutable Audit Log</span>
          <span className="text-xs bg-slate-200 px-1.5 py-0.2 rounded-full text-slate-700">{auditEvents.length}</span>
        </button>
      </div>

      {/* Tab 1: Live Field Feed */}
      {activeTab === "live-feed" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Field Feed (All System Scans)</h2>
              <p className="text-xs text-slate-500">
                Authorized under <code className="text-amber-800 font-mono">scans_inspector_read</code> PostgreSQL RLS policy
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
              Inspector Read-All Scope
            </span>
          </div>
          <div className="p-4">
            <LiveScanList initial={initialScans} showOwner={true} />
          </div>
        </div>
      )}

      {/* Tab 2: Rule Governance Dashboard */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Active Compliance Rule Registry</h2>
                <p className="text-xs text-slate-500">
                  Versioned legal rules. Only inspectors may edit after step-up password confirmation.
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Active Gazette Baseline: <strong className="text-slate-900">v2024.2 (Effective 01-Jun-2024)</strong>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {rule.id}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">{rule.name}</h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                          {rule.status}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          v{rule.version}
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 font-semibold">{rule.legal_source}</p>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{rule.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                        <span>Last modified by: {rule.last_modified_by}</span>
                        <span>•</span>
                        <span>Effective: {rule.effective_from}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setTargetRule(rule);
                        setStepUpModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold self-start shadow-sm transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit Rule (Step-Up)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Immutable Audit Log Viewer */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Immutable Audit Event Stream</h2>
              <p className="text-xs text-slate-500">
                Append-only PostgreSQL table (<code className="text-slate-800">audit_events</code>). Zero update/delete privileges.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
              WORM (Write Once, Read Many)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="p-3">ID</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Audit Details</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50 font-mono">
                    <td className="p-3 text-slate-500">#{evt.id}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {evt.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700">{evt.target_type}</td>
                    <td className="p-3 text-slate-500 truncate max-w-[130px]">{evt.actor_id}</td>
                    <td className="p-3 text-slate-800 font-sans text-xs">
                      {JSON.stringify(evt.detail)}
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step-Up Password Challenge Modal */}
      {stepUpModalOpen && targetRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Inspector Step-Up Authentication</h3>
                  <p className="text-xs text-slate-400">Section 1 & 5 Mandatory Security Rule</p>
                </div>
              </div>
              <button
                onClick={() => setStepUpModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStepUpSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                <strong className="block text-amber-950">Privileged Rule Modification:</strong>
                You are proposing an amendment to statutory rule <strong>{targetRule.id}</strong> ({targetRule.name}). Re-enter the statutory admin password to issue a draft version.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Enter Admin Password for Step-Up Verification
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password (e.g. admin123)"
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Demo hint: accepted password is <code>admin123</code> or <code>admin</code>
                </span>
              </div>

              {stepUpError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{stepUpError}</span>
                </div>
              )}

              {stepUpSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{stepUpSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStepUpModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !password.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{submitting ? "Verifying…" : "Authenticate & Amend"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
