// Stub extractor (Phase 1 only): returns clearly fake sample fields so the live flow can be demoed before real OCR exists.
import type { Panel } from "./uploadValidation";

export interface ExtractedFieldInput {
  key: string;
  value: string | null;
  unit: string | null;
  confidence: number;
  status: "ok" | "uncertain" | "missing";
}

// Returns sample fields for a given panel. Values are placeholders marked "(sample)", and one is deliberately
// 'uncertain' and one 'missing' so the review screen has something to show. Real Gemini extraction replaces this in Phase 2.
export function stubExtract(panel: Panel): ExtractedFieldInput[] {
  switch (panel) {
    case "front":
      return [
        { key: "product_name", value: "Sample Biscuits (sample)", unit: null, confidence: 0.95, status: "ok" },
        { key: "brand", value: "Sample Brand (sample)", unit: null, confidence: 0.6, status: "uncertain" },
      ];
    case "ingredients":
      return [{ key: "ingredients", value: "Wheat flour, sugar, edible vegetable oil (sample)", unit: null, confidence: 0.7, status: "uncertain" }];
    case "nutrition":
      return [
        { key: "sugar_per_100g", value: "22", unit: "g", confidence: 0.9, status: "ok" },
        { key: "sodium_per_100g", value: null, unit: "mg", confidence: 0, status: "missing" },
      ];
    case "declaration":
      return [
        { key: "net_quantity", value: "100", unit: "g", confidence: 0.85, status: "ok" },
        { key: "mrp", value: null, unit: "INR", confidence: 0, status: "missing" },
      ];
  }
}
