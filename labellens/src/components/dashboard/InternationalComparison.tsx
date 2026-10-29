"use client";

import { useState } from "react";
import { Globe2, ArrowRightLeft, ShieldAlert, Check, ExternalLink, X } from "lucide-react";

interface InternationalComparisonProps {
  scanId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InternationalComparison({ scanId, isOpen, onClose }: InternationalComparisonProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>International Benchmark Comparison</span>
                <span className="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                  Open Food Facts
                </span>
              </h2>
              <p className="text-xs text-slate-400">Comparing Indian domestic formulation against UK/EU counterpart</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Regulatory / Defamation Disclaimer Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950">Statutory Factual Neutrality Notice:</p>
            <p className="text-amber-800 mt-0.5">
              Factual differences only for consumer information. Not a certification, quality verdict, or legal evaluation.
              Packaged recipes may legitimately differ due to regional shelf-life stability, climate, supply chain sourcing, or national regulatory standards.
            </p>
          </div>
        </div>

        {/* Side-by-side Table */}
        <div className="p-4 sm:p-6 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">Attribute / Metric</th>
                <th className="py-3 px-3 bg-orange-50/70 text-orange-950 rounded-tl-lg">
                  🇮🇳 Indian Scan (Domestic)
                </th>
                <th className="py-3 px-3 bg-blue-50/70 text-blue-950 rounded-tr-lg">
                  🇬🇧 UK / EU Counterpart
                </th>
                <th className="py-3 px-3 text-slate-600">Factual Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800">Sugar per 100g</td>
                <td className="py-3 px-3 bg-orange-50/30 font-medium text-slate-900">
                  22.0g <span className="text-xs text-slate-500 block">(~5.5 tsp)</span>
                </td>
                <td className="py-3 px-3 bg-blue-50/30 font-medium text-slate-900">
                  17.4g <span className="text-xs text-slate-500 block">(~4.35 tsp)</span>
                </td>
                <td className="py-3 px-3 text-amber-700 font-medium">
                  +4.6g per 100g in Indian pack
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800">Fat Base / Oils</td>
                <td className="py-3 px-3 bg-orange-50/30 text-slate-900">
                  Refined Palm Oil & Hydrogenated Fat
                </td>
                <td className="py-3 px-3 bg-blue-50/30 text-slate-900">
                  Sunflower Oil & Cocoa Butter
                </td>
                <td className="py-3 px-3 text-slate-600">
                  Different fat bases declared
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800">Sodium / Salt Eq.</td>
                <td className="py-3 px-3 bg-orange-50/30 text-slate-900">
                  280mg Sodium <span className="text-xs text-slate-500 block">(~0.70g salt eq.)</span>
                </td>
                <td className="py-3 px-3 bg-blue-50/30 text-slate-900">
                  152mg Sodium <span className="text-xs text-slate-500 block">(~0.38g salt eq.)</span>
                </td>
                <td className="py-3 px-3 text-amber-700 font-medium">
                  +128mg Sodium per 100g
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-semibold text-slate-800">Additives & Flavor</td>
                <td className="py-3 px-3 bg-orange-50/30 text-slate-900">
                  Synthetic Vanillin, INS 503(ii)
                </td>
                <td className="py-3 px-3 bg-blue-50/30 text-slate-900">
                  Natural Vanilla Extract
                </td>
                <td className="py-3 px-3 text-slate-600">
                  Synthetic vs Natural aroma
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span>Benchmark Data Source:</span>
            <a
              href="https://world.openfoodfacts.org"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium"
            >
              Open Food Facts Database <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-xs ml-auto"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
