import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Comparison data comparing Indian product with international (e.g., UK / EU counterpart)
  // Per Section 1 & 5 of the Implementation Plan: "Output is factual differences only, never a 'bad product' verdict"
  const comparisonData = {
    scanId: params.id,
    indianProduct: {
      market: "India (Domestic)",
      title: "Sample Cookies / Chocolate Bar (Indian formulation)",
      servingSize: "100g",
      sugarPer100g: "22.0g",
      saltOrSodium: "Sodium: 280mg (~0.7g Salt equivalent)",
      saturatedFat: "11.2g",
      palmOilOrFat: "Refined Palm Oil & Hydrogenated Vegetable Fats",
      additives: ["INS 322 (Lecithin)", "INS 500(ii)", "INS 503(ii)", "Artificial Vanillin Flavouring"],
    },
    internationalCounterpart: {
      market: "United Kingdom / EU (Open Food Facts)",
      title: "Counterpart Variant (UK/EU formulation)",
      servingSize: "100g",
      sugarPer100g: "17.4g",
      saltOrSodium: "Salt: 0.38g (Sodium: ~152mg)",
      saturatedFat: "6.8g",
      palmOilOrFat: "Sunflower Oil & Cocoa Butter",
      additives: ["Sunflower Lecithin (E322)", "Sodium Bicarbonate (E500)", "Natural Vanilla Flavour"],
      sourceDatabase: "Open Food Facts (Public Database)",
      sourceUrl: "https://world.openfoodfacts.org",
    },
    factualDifferences: [
      {
        metric: "Sugar Content per 100g",
        india: "22.0g (~5.5 tsp)",
        international: "17.4g (~4.35 tsp)",
        delta: "+4.6g per 100g in Indian variant",
      },
      {
        metric: "Fat Source / Vegetable Oil",
        india: "Refined Palm Oil & Hydrogenated Fat",
        international: "Sunflower Oil & Cocoa Butter",
        delta: "Different fat bases declared on pack",
      },
      {
        metric: "Sodium / Salt Equivalent",
        india: "280mg Sodium (~0.70g salt eq.)",
        international: "152mg Sodium (~0.38g salt eq.)",
        delta: "+128mg Sodium per 100g in Indian variant",
      },
      {
        metric: "Additives & Flavoring",
        india: "Artificial Vanillin, INS 503(ii)",
        international: "Natural Vanilla Flavor",
        delta: "Synthetic flavoring vs natural extract",
      },
    ],
    disclaimer: "Factual differences only for consumer information. Not a certification, quality verdict, or legal evaluation. Recipes may legitimately vary according to regional climate, ingredient sourcing, and taste profiles.",
  };

  return NextResponse.json(comparisonData);
}
