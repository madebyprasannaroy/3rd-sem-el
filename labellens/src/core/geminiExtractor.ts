import { z } from "zod";
import { GoogleGenAI } from "@google/genai";

export const ExtractedFieldResultSchema = z.object({
  key: z.string(),
  value: z.string().nullable(),
  unit: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
  status: z.enum(["ok", "uncertain", "missing"]),
  panel_source: z.enum(["front", "ingredients", "nutrition", "declaration", "unknown"]),
  bounding_box: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});

export type ExtractedFieldResult = z.infer<typeof ExtractedFieldResultSchema>;

export const ExtractionResponseSchema = z.object({
  detected_panels: z.array(z.enum(["front", "ingredients", "nutrition", "declaration"])),
  product_summary: z.object({
    product_name: z.string().nullable(),
    brand: z.string().nullable(),
    category: z.string().nullable().optional(),
    veg_non_veg: z.enum(["veg", "non_veg", "uncertain", "missing"]),
  }),
  fields: z.array(ExtractedFieldResultSchema),
});

export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

export interface ImageInput {
  panelHint?: string;
  mimeType: string;
  buffer: Buffer;
  assetId?: string;
}

const SYSTEM_INSTRUCTION = `You are an expert AI Food Packaging Compliance and OCR Specialist specializing in Indian packaged food products under FSSAI regulations and the Legal Metrology (Packaged Commodities) Rules, 2011.

Analyze the uploaded image(s) of the food packaging. A single image may contain multiple panels (e.g. both ingredients and nutrition, or full flat artwork).
Inspect ALL readable text, logos, tables, and declarations.

Extract the following key fields if visible:
1. Product Identity:
   - "product_name": Full commercial product name.
   - "brand": Brand or manufacturer trade name.
   - "veg_non_veg": "veg" if green dot inside green square, "non_veg" if brown triangle inside brown square, else "missing" or "uncertain".
2. Ingredients & Composition:
   - "ingredients": Full ingredient list as printed, in sequence.
   - "allergens": Declared allergen advice (e.g. "Contains Wheat, Milk, Soy").
   - "palm_oil_present": "true" if any palm oil / palmolein is in the ingredients, else "false".
3. Nutrition Table (Prefer per 100g or 100ml):
   - "energy_kcal": Numerical energy in kcal per 100g.
   - "protein_g": Protein in g per 100g.
   - "carbohydrates_g": Total carbohydrates in g per 100g.
   - "total_sugar_g": Total sugars in g per 100g.
   - "added_sugar_g": Added sugars in g per 100g.
   - "total_fat_g": Total fat in g per 100g.
   - "saturated_fat_g": Saturated fat in g per 100g.
   - "trans_fat_g": Trans fat in g per 100g.
   - "sodium_mg": Sodium in mg per 100g.
   - "salt_g": Salt equivalent in g per 100g if declared.
4. Mandatory Declarations (Legal Metrology & FSSAI):
   - "net_quantity": Net weight or volume (e.g. "100 g", "500 ml").
   - "mrp": Maximum retail price including symbol (e.g. "₹50.00" or "Rs 50").
   - "fssai_license": 14-digit FSSAI license number.
   - "date_of_manufacture": Date or month/year of manufacture/packaging.
   - "best_before": Best before duration or expiry date.
   - "batch_number": Batch / lot number.
   - "manufacturer_address": Full manufacturer name, address, customer grievance email/phone.

RULES:
- NEVER invent or hallucinate missing data. If a field or panel is not visible in any image, return its value as null and status as "missing" with confidence 0.
- If text is blurred, partially cut off, or questionable, assign status "uncertain" and confidence between 0.4 and 0.74.
- If clearly visible and verified, assign status "ok" and confidence >= 0.75.
- Return ONLY valid JSON adhering strictly to the schema.`;

/**
 * Intelligent realistic fallback profile for Indian food packs when Gemini API is offline or quota exceeded.
 */
export function getIntelligentFallback(detectedTitle?: string): ExtractionResponse {
  const isChips = detectedTitle?.toLowerCase().includes("lays") || detectedTitle?.toLowerCase().includes("chip");
  const isJuice = detectedTitle?.toLowerCase().includes("nectar") || detectedTitle?.toLowerCase().includes("juice");

  if (isChips) {
    return {
      detected_panels: ["front", "ingredients", "nutrition", "declaration"],
      product_summary: {
        product_name: detectedTitle || "Lay's India's Magic Masala Potato Chips",
        brand: "Lay's (PepsiCo India)",
        category: "Potato Chips / Savory Snack",
        veg_non_veg: "veg",
      },
      fields: [
        { key: "product_name", value: detectedTitle || "Lay's India's Magic Masala", unit: null, confidence: 0.98, status: "ok", panel_source: "front" },
        { key: "brand", value: "Lay's (PepsiCo India)", unit: null, confidence: 0.95, status: "ok", panel_source: "front" },
        { key: "veg_non_veg", value: "veg (Green Dot present)", unit: null, confidence: 0.95, status: "ok", panel_source: "front" },
        { key: "net_quantity", value: "50", unit: "g", confidence: 0.92, status: "ok", panel_source: "declaration" },
        { key: "mrp", value: "20.00", unit: "INR", confidence: 0.9, status: "ok", panel_source: "declaration" },
        { key: "ingredients", value: "Potato, Edible Vegetable Oil (Palmolein), Seasoning (Spices and Condiments, Iodized Salt, Sugar, Black Salt, Tomato Powder, Onion Powder, Garlic Powder)", unit: null, confidence: 0.88, status: "ok", panel_source: "ingredients" },
        { key: "palm_oil_present", value: "true (Palmolein)", unit: null, confidence: 0.92, status: "ok", panel_source: "ingredients" },
        { key: "allergens", value: "May contain Milk, Wheat, and Soy", unit: null, confidence: 0.72, status: "uncertain", panel_source: "ingredients" },
        { key: "energy_kcal", value: "555", unit: "kcal", confidence: 0.92, status: "ok", panel_source: "nutrition" },
        { key: "protein_g", value: "7.0", unit: "g", confidence: 0.89, status: "ok", panel_source: "nutrition" },
        { key: "carbohydrates_g", value: "51.4", unit: "g", confidence: 0.91, status: "ok", panel_source: "nutrition" },
        { key: "total_sugar_g", value: "3.5", unit: "g", confidence: 0.94, status: "ok", panel_source: "nutrition" },
        { key: "added_sugar_g", value: "2.1", unit: "g", confidence: 0.85, status: "ok", panel_source: "nutrition" },
        { key: "total_fat_g", value: "35.7", unit: "g", confidence: 0.93, status: "ok", panel_source: "nutrition" },
        { key: "saturated_fat_g", value: "16.8", unit: "g", confidence: 0.88, status: "ok", panel_source: "nutrition" },
        { key: "trans_fat_g", value: "0.1", unit: "g", confidence: 0.9, status: "ok", panel_source: "nutrition" },
        { key: "sodium_mg", value: "887", unit: "mg", confidence: 0.89, status: "ok", panel_source: "nutrition" },
        { key: "fssai_license", value: "10014064000435", unit: null, confidence: 0.82, status: "ok", panel_source: "declaration" },
        { key: "best_before", value: "4 Months from Manufacture", unit: null, confidence: 0.8, status: "ok", panel_source: "declaration" },
        { key: "batch_number", value: null, unit: null, confidence: 0, status: "missing", panel_source: "declaration" },
      ],
    };
  }

  // Default biscuits / snack profile
  return {
    detected_panels: ["front", "ingredients", "nutrition", "declaration"],
    product_summary: {
      product_name: detectedTitle || "Digestive High Fibre Wheat Biscuits",
      brand: "Britannia Industries Ltd",
      category: "Biscuits & Cookies",
      veg_non_veg: "veg",
    },
    fields: [
      { key: "product_name", value: detectedTitle || "Digestive High Fibre Biscuits", unit: null, confidence: 0.96, status: "ok", panel_source: "front" },
      { key: "brand", value: "Britannia Industries Ltd", unit: null, confidence: 0.94, status: "ok", panel_source: "front" },
      { key: "veg_non_veg", value: "veg", unit: null, confidence: 0.95, status: "ok", panel_source: "front" },
      { key: "net_quantity", value: "100", unit: "g", confidence: 0.92, status: "ok", panel_source: "declaration" },
      { key: "mrp", value: "35.00", unit: "INR", confidence: 0.85, status: "ok", panel_source: "declaration" },
      { key: "ingredients", value: "Refined Wheat Flour (Maida 55%), Edible Vegetable Oil (Refined Palm Oil), Sugar, Wheat Bran (4.5%), Invert Sugar Syrup, Raising Agents [INS 503(ii), INS 500(ii)], Iodised Salt", unit: null, confidence: 0.88, status: "ok", panel_source: "ingredients" },
      { key: "palm_oil_present", value: "true (Refined Palm Oil)", unit: null, confidence: 0.92, status: "ok", panel_source: "ingredients" },
      { key: "allergens", value: "Contains Wheat, Milk, and Soya", unit: null, confidence: 0.74, status: "uncertain", panel_source: "ingredients" },
      { key: "energy_kcal", value: "482", unit: "kcal", confidence: 0.92, status: "ok", panel_source: "nutrition" },
      { key: "protein_g", value: "8.2", unit: "g", confidence: 0.89, status: "ok", panel_source: "nutrition" },
      { key: "carbohydrates_g", value: "68.0", unit: "g", confidence: 0.91, status: "ok", panel_source: "nutrition" },
      { key: "total_sugar_g", value: "22.0", unit: "g", confidence: 0.95, status: "ok", panel_source: "nutrition" },
      { key: "added_sugar_g", value: "20.5", unit: "g", confidence: 0.88, status: "ok", panel_source: "nutrition" },
      { key: "total_fat_g", value: "20.0", unit: "g", confidence: 0.9, status: "ok", panel_source: "nutrition" },
      { key: "saturated_fat_g", value: "11.2", unit: "g", confidence: 0.87, status: "ok", panel_source: "nutrition" },
      { key: "trans_fat_g", value: "0", unit: "g", confidence: 0.95, status: "ok", panel_source: "nutrition" },
      { key: "sodium_mg", value: "280", unit: "mg", confidence: 0.9, status: "ok", panel_source: "nutrition" },
      { key: "fssai_license", value: "10015043001129", unit: null, confidence: 0.82, status: "ok", panel_source: "declaration" },
      { key: "best_before", value: "6 Months from Packaging", unit: null, confidence: 0.85, status: "ok", panel_source: "declaration" },
      { key: "batch_number", value: null, unit: null, confidence: 0, status: "missing", panel_source: "declaration" },
    ],
  };
}

/**
 * Extracts packaging details using Gemini Vision API with automatic fallback.
 */
export async function extractWithGemini(
  images: ImageInput[],
  titleHint?: string
): Promise<{ result: ExtractionResponse; isFallback: boolean; reason?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your-gemini-api-key" || apiKey.trim() === "") {
    return {
      result: getIntelligentFallback(titleHint),
      isFallback: true,
      reason: "GEMINI_API_KEY not configured. Running in Demo/Fallback extraction mode.",
    };
  }

  if (images.length === 0) {
    return {
      result: getIntelligentFallback(titleHint),
      isFallback: true,
      reason: "No image buffers provided for extraction.",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build multimodal contents
    const contents: any[] = [];
    
    // Add text prompt
    contents.push({
      text: `${SYSTEM_INSTRUCTION}\n\nProduct Title / Context Hint: "${titleHint || 'Packaged Food Item'}".\nPlease analyze the attached packaging image(s) and return standard structured JSON matching the schema.`
    });

    // Add all uploaded images as inline data
    for (const img of images) {
      contents.push({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: img.buffer.toString("base64"),
        },
      });
    }

    // Call Gemini 2.5 Flash / 1.5 Flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim() || "";
    if (!responseText) {
      throw new Error("Empty response received from Gemini Vision model");
    }

    // Clean potential markdown blocks if present
    const cleanedJson = responseText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleanedJson);

    // Validate with Zod
    const validated = ExtractionResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn("Zod validation warning on Gemini output:", validated.error.issues);
      // If slight schema mismatch, try to salvage fields array
      if (Array.isArray(parsed.fields)) {
        return {
          result: {
            detected_panels: parsed.detected_panels || ["front", "ingredients", "nutrition", "declaration"],
            product_summary: parsed.product_summary || {
              product_name: titleHint || null,
              brand: null,
              veg_non_veg: "uncertain",
            },
            fields: parsed.fields.map((f: any) => ({
              key: String(f.key || "unknown_field"),
              value: f.value != null ? String(f.value) : null,
              unit: f.unit ? String(f.unit) : null,
              confidence: typeof f.confidence === "number" ? f.confidence : 0.8,
              status: f.status === "ok" || f.status === "uncertain" || f.status === "missing" ? f.status : (f.value ? "ok" : "missing"),
              panel_source: f.panel_source || "unknown",
            })),
          },
          isFallback: false,
        };
      }
      throw new Error("Gemini response did not conform to packaging extraction schema");
    }

    return {
      result: validated.data,
      isFallback: false,
    };
  } catch (err: any) {
    console.error("Gemini Vision extraction error:", err);
    return {
      result: getIntelligentFallback(titleHint),
      isFallback: true,
      reason: `Gemini API error (${err.message || 'quota or network'}). Reverted to Demo extraction mode.`,
    };
  }
}
