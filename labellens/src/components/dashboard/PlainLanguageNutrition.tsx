"use client";

import { Sparkles, Info, Coffee, Droplet, HeartCrack, CheckCircle, AlertTriangle } from "lucide-react";

interface PlainLanguageNutritionProps {
  sugarGrams?: number;
  sodiumMg?: number;
  saturatedFatGrams?: number;
  transFatGrams?: number;
  servingGrams?: number;
}

export default function PlainLanguageNutrition({
  sugarGrams = 22,
  sodiumMg = 280,
  saturatedFatGrams = 11.2,
  transFatGrams = 0,
  servingGrams = 100,
}: PlainLanguageNutritionProps) {
  // Deterministic math: 1 level standard teaspoon = 4g sugar
  const sugarTeaspoons = (sugarGrams / 4).toFixed(1);
  // Sodium to Salt equivalent: Salt (g) = Sodium (mg) * 2.54 / 1000
  const saltEquivalentGrams = ((sodiumMg * 2.54) / 1000).toFixed(2);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-100 text-brand-800 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Deterministic Plain-Language Nutrition</h3>
            <p className="text-xs text-slate-500">Calculated strictly from label numbers • No subjective verdicts</p>
          </div>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700">
          Per {servingGrams}g portion
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sugar Teaspoon Visualizer */}
        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-amber-900 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-amber-700" />
                Sugar in Teaspoons
              </span>
              <span className="text-xs font-bold bg-amber-200/70 px-1.5 py-0.5 rounded text-amber-800">
                {sugarGrams}g Total
              </span>
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-amber-900">~{sugarTeaspoons}</span>
                <span className="text-sm font-medium text-amber-800">level teaspoons</span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                Assuming standard 4.0g per household level teaspoon.
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-200/80 flex items-center gap-1 text-[11px] text-amber-700">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>FSSAI threshold: high sugar is &gt;10g / 100g.</span>
          </div>
        </div>

        {/* Sodium vs Salt Distinction */}
        <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-900 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Droplet className="w-4 h-4 text-blue-700" />
                Sodium vs. Table Salt
              </span>
              <span className="text-xs font-bold bg-blue-200/70 px-1.5 py-0.5 rounded text-blue-800">
                {sodiumMg}mg
              </span>
            </div>
            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-blue-900">~{saltEquivalentGrams}g</span>
                <span className="text-sm font-medium text-blue-800">salt equivalent</span>
              </div>
              <p className="text-xs text-blue-800 mt-1">
                Elemental sodium is not identical to NaCl table salt (conversion factor 2.54).
              </p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200/80 flex items-center gap-1 text-[11px] text-blue-700">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>WHO daily recommended sodium limit is &lt;2000mg.</span>
          </div>
        </div>

        {/* Fat Quality & Trans Fat Declaration */}
        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-emerald-900 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <HeartCrack className="w-4 h-4 text-emerald-700" />
                Fat Composition
              </span>
              <span className="text-xs font-bold bg-emerald-200/70 px-1.5 py-0.5 rounded text-emerald-800">
                FSSAI Regs
              </span>
            </div>
            <div className="my-2 space-y-1.5 text-xs text-emerald-950">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Saturated Fatty Acids:</span>
                <span className="font-semibold">{saturatedFatGrams}g</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Trans Fatty Acids:</span>
                <span className="font-semibold flex items-center gap-1 text-emerald-700">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {transFatGrams === 0 ? "0g (Compliant <2%)" : `${transFatGrams}g`}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-200/80 flex items-center gap-1 text-[11px] text-emerald-700">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>India caps industrial trans fats at &lt;2% by weight of total oils/fats.</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50/80 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Formula: Teaspoons = Sugar(g) ÷ 4.0 | Salt(g) = Sodium(mg) × 0.00254</span>
        <span className="font-medium">Preliminary assisted math • Not medical guidance</span>
      </div>
    </div>
  );
}
