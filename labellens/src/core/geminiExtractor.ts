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

export interface ExtractionResult {
  ok: boolean;
  result: ExtractionResponse;
  fields: ExtractedFieldResult[];
  detected_panels: ("front" | "ingredients" | "nutrition" | "declaration")[];
  product_summary: {
    product_name: string | null;
    brand: string | null;
    category?: string | null;
    veg_non_veg: "veg" | "non_veg" | "uncertain" | "missing";
  };
  error?: string;
  message?: string;
}

const SYSTEM_INSTRUCTION = `You are an expert AI Food Packaging OCR Specialist and Compliance Analyst specializing in packaged food products under FSSAI regulations and Legal Metrology rules.

Your task is to perform thorough optical character recognition (OCR) on the uploaded food packaging image(s) and extract all visible declarations, nutrition values, and packaging text.

RULES:
1. ONLY return fields that are ACTUALLY VISIBLE AND READABLE in the uploaded packaging image(s).
2. DO NOT output placeholder fields or keys with null or "missing" values. If a field or panel is not in the image, simply omit it.
3. Inspect ALL readable text across the packaging:
   - Product Identity: "product_name" (full commercial name), "brand" (manufacturer/brand name), "veg_non_veg" ("veg" if green dot in green square, "non_veg" if brown triangle in brown square).
   - Packaging Claims: Any front-of-pack claims (e.g. "High Protein", "No Added Sugar", "100% Whole Wheat").
   - Net Quantity: "net_quantity" (e.g. "100 g", "500 ml", "50g").
   - Nutrition Table / Nutrition Facts (Supports both US FDA Nutrition Facts and Indian/Global FSSAI tables):
     * "serving_size": Serving size as printed (e.g. "1 oz (28g / about 15 chips)").
     * "energy_kcal": Calories or Energy (e.g. "160", unit: "kcal" or "Calories").
     * "total_fat_g": Total Fat (e.g. "10", unit: "g").
     * "saturated_fat_g": Saturated Fat (e.g. "1.5", unit: "g").
     * "trans_fat_g": Trans Fat (e.g. "0", unit: "g").
     * "cholesterol_mg": Cholesterol (e.g. "0", unit: "mg").
     * "sodium_mg": Sodium (e.g. "170", unit: "mg").
     * "potassium_mg": Potassium (e.g. "350", unit: "mg").
     * "carbohydrates_g": Total Carbohydrate (e.g. "15", unit: "g").
     * "dietary_fiber_g": Dietary Fiber (e.g. "1", unit: "g").
     * "total_sugar_g": Total Sugars or Sugars (e.g. "<1" or "1", unit: "g").
     * "added_sugar_g": Added Sugars if declared (e.g. "0", unit: "g").
     * "protein_g": Protein (e.g. "2", unit: "g").
     * Extract any other declared vitamins or minerals (e.g. "vitamin_c", "iron", "calcium").
     * IMPORTANT: Extract declared numbers as printed (whether given per serving, per 100g, or per pack). Do NOT discard numbers because they are per serving!
   - Ingredients & Allergens:
     * "ingredients": Full ingredient sequence as printed (e.g. "Potatoes, Vegetable Oil (Sunflower, Corn and/or Canola Oil), and Salt.").
     * "allergens": Allergen declaration if printed.
     * "palm_oil_present": "true" if palm oil or palmolein is listed, else "false".
   - Statutory Declarations:
     * "mrp": Maximum retail price including currency symbol (e.g. "₹20.00" or "Rs 20").
     * "fssai_license": 14-digit FSSAI license number.
     * "date_of_manufacture": Manufacturing/packaging date.
     * "best_before": Best before duration or expiry date.
     * "batch_number": Batch or lot number.
     * "manufacturer_address": Manufacturer name, address, or customer care details.

4. Assign confidence >= 0.85 and status "ok" if clearly readable. If partially cut off or questionable, assign status "uncertain" and confidence 0.5-0.74.
5. Return ONLY a single JSON object strictly matching this format:
{
  "detected_panels": ["front", "ingredients", "nutrition", "declaration"],
  "product_summary": {
    "product_name": "Product Name or null",
    "brand": "Brand Name or null",
    "category": "Category or null",
    "veg_non_veg": "veg"
  },
  "fields": [
    {
      "key": "product_name",
      "value": "Exact text from label",
      "unit": null,
      "confidence": 0.95,
      "status": "ok",
      "panel_source": "front"
    }
  ]
}`;

/**
 * Resilient normalizer that maps various JSON output shapes from LLMs into standard ExtractionResponse.
 */
function normalizeGeminiOutput(raw: any, titleHint?: string): ExtractionResponse {
  let detectedPanels: ("front" | "ingredients" | "nutrition" | "declaration")[] = ["front"];
  const productSummary = {
    product_name: titleHint || null,
    brand: null as string | null,
    category: null as string | null | undefined,
    veg_non_veg: "uncertain" as "veg" | "non_veg" | "uncertain" | "missing",
  };
  let rawFields: any[] = [];

  if (Array.isArray(raw)) {
    rawFields = raw;
  } else if (raw && typeof raw === "object") {
    if (Array.isArray(raw.detected_panels)) {
      detectedPanels = raw.detected_panels.filter((p: string) =>
        ["front", "ingredients", "nutrition", "declaration"].includes(p)
      );
      if (detectedPanels.length === 0) detectedPanels = ["front"];
    }

    if (raw.product_summary && typeof raw.product_summary === "object") {
      productSummary.product_name = raw.product_summary.product_name || productSummary.product_name;
      productSummary.brand = raw.product_summary.brand || null;
      productSummary.category = raw.product_summary.category || null;
      const v = String(raw.product_summary.veg_non_veg || "").toLowerCase();
      if (v.includes("non") || v === "non_veg") productSummary.veg_non_veg = "non_veg";
      else if (v.includes("veg")) productSummary.veg_non_veg = "veg";
      else if (v === "missing") productSummary.veg_non_veg = "missing";
      else productSummary.veg_non_veg = "uncertain";
    }

    if (Array.isArray(raw.fields)) {
      rawFields = raw.fields;
    } else if (raw.data && Array.isArray(raw.data.fields)) {
      rawFields = raw.data.fields;
    } else if (Array.isArray(raw.extracted_fields)) {
      rawFields = raw.extracted_fields;
    } else {
      const ignoredKeys = new Set(["detected_panels", "product_summary", "success", "ok", "error", "message"]);
      rawFields = Object.entries(raw)
        .filter(([k]) => !ignoredKeys.has(k))
        .map(([k, v]) => {
          if (v && typeof v === "object" && !Array.isArray(v) && "value" in v) {
            return { key: k, ...(v as object) };
          }
          return {
            key: k,
            value: v != null ? (typeof v === "object" ? JSON.stringify(v) : String(v)) : null,
            confidence: 0.85,
            status: v != null ? "ok" : "missing",
            panel_source:
              k.includes("sugar") || k.includes("energy") || k.includes("fat") || k.includes("sodium") || k.includes("protein")
                ? "nutrition"
                : k.includes("ingredient") || k.includes("allergen")
                  ? "ingredients"
                  : k.includes("mrp") || k.includes("fssai") || k.includes("expiry") || k.includes("date") || k.includes("batch")
                    ? "declaration"
                    : "front",
          };
        });
    }
  }

  const fields = rawFields.map((f: any) => {
    const key = String(f.key || f.name || "field");
    const rawVal = f.value ?? f.val;
    const value = rawVal != null ? (typeof rawVal === "object" ? JSON.stringify(rawVal) : String(rawVal)) : null;
    const unit = f.unit ? String(f.unit) : null;
    const confidence =
      typeof f.confidence === "number" && !isNaN(f.confidence)
        ? Math.max(0, Math.min(1, f.confidence))
        : value
          ? 0.85
          : 0;
    const rawStatus = String(f.status || "").toLowerCase();
    const status: "ok" | "uncertain" | "missing" =
      rawStatus === "ok" || rawStatus === "uncertain" || rawStatus === "missing"
        ? rawStatus
        : value
          ? "ok"
          : "missing";
    const rawPanel = String(f.panel_source || f.panel || "").toLowerCase();
    const panel_source: "front" | "ingredients" | "nutrition" | "declaration" | "unknown" =
      rawPanel === "front" || rawPanel === "ingredients" || rawPanel === "nutrition" || rawPanel === "declaration"
        ? rawPanel
        : "unknown";

    return {
      key,
      value,
      unit,
      confidence,
      status,
      panel_source,
      bounding_box:
        Array.isArray(f.bounding_box) && f.bounding_box.length === 4 ? f.bounding_box : undefined,
    };
  })
  // Only keep fields that were genuinely detected with a real value
  .filter((f) => f.value !== null && f.value.trim() !== "" && f.status !== "missing");

  // Ensure product_name and brand are in fields list for display
  if (productSummary.product_name && !fields.some((f) => f.key === "product_name")) {
    fields.unshift({
      key: "product_name",
      value: productSummary.product_name,
      unit: null,
      confidence: 0.95,
      status: "ok",
      panel_source: "front",
      bounding_box: undefined,
    });
  }
  if (productSummary.brand && !fields.some((f) => f.key === "brand")) {
    fields.unshift({
      key: "brand",
      value: productSummary.brand,
      unit: null,
      confidence: 0.95,
      status: "ok",
      panel_source: "front",
      bounding_box: undefined,
    });
  }

  return {
    detected_panels: detectedPanels,
    product_summary: productSummary,
    fields,
  };
}

/**
 * Extracts packaging details using Gemini Vision API.
 * Never substitutes mock or dummy data.
 */
export async function extractWithGemini(
  images: ImageInput[],
  titleHint?: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured in .env.local. Please provide a valid Google Gemini API key."
    );
  }

  if (images.length === 0) {
    throw new Error("No packaging images were provided for extraction.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Build multimodal contents: attach image parts first, followed by OCR extraction prompt
    const parts: any[] = [];

    for (const img of images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: img.buffer.toString("base64"),
        },
      });
    }

    parts.push({
      text: `${SYSTEM_INSTRUCTION}\n\nContext Hint / Title: "${titleHint || "Packaged Food Product"}".\n\nThoroughly inspect every corner of the packaging image(s) attached above. Read all visible printed text, product names, nutrition table rows, ingredients, and declarations. Return ONLY the fields that are actually visible and printed on the packaging.`,
    });

    const contents = [{ role: "user", parts }];

    // Try Gemini 3.8 Flash, and fallback to Gemini 3.8 Pro if Flash is overloaded
    const candidateModels = ["gemini-3.8-flash", "gemini-3.8-pro"];
    let responseText = "";
    let lastApiError: any = null;

    for (const modelName of candidateModels) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
              responseMimeType: "application/json",
            },
          });

          responseText = response.text?.trim() || "";
          if (responseText) break;
        } catch (callErr: any) {
          lastApiError = callErr;
          const errMsg = String(callErr?.message || "");
          const isTransient =
            callErr?.status === 503 ||
            callErr?.status === 429 ||
            errMsg.includes("503") ||
            errMsg.includes("429") ||
            errMsg.includes("high demand") ||
            errMsg.includes("UNAVAILABLE");

          // If temporary 503/429 spike, wait with progressive backoff and retry
          if (isTransient && attempt < 3) {
            const delay = attempt * 2000; // 2s, 4s
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // If 404 or exhausted retries, try next candidate model
          break;
        }
      }

      if (responseText) break;
    }

    if (!responseText) {
      const msg = String(lastApiError?.message || "");
      if (msg.includes("high demand") || msg.includes("503") || lastApiError?.status === 503) {
        throw new Error(
          "Gemini Vision servers are currently experiencing a brief traffic spike. Please wait 15–30 seconds and click 'Upload & Extract' again."
        );
      }
      throw lastApiError || new Error("Empty response received from Gemini Vision model");
    }

    // Clean potential markdown blocks if present
    const cleanedJson = responseText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleanedJson);

    // Validate with Zod first
    const validated = ExtractionResponseSchema.safeParse(parsed);
    if (validated.success) {
      // Filter out empty/missing template fields so only scanned fields are returned
      const scannedFields = validated.data.fields.filter(
        (f) => f.value !== null && String(f.value).trim() !== "" && f.status !== "missing"
      );

      // Ensure product_name and brand are in fields list for display
      if (validated.data.product_summary.product_name && !scannedFields.some((f) => f.key === "product_name")) {
        scannedFields.unshift({
          key: "product_name",
          value: validated.data.product_summary.product_name,
          unit: null,
          confidence: 0.95,
          status: "ok",
          panel_source: "front",
        });
      }
      if (validated.data.product_summary.brand && !scannedFields.some((f) => f.key === "brand")) {
        scannedFields.unshift({
          key: "brand",
          value: validated.data.product_summary.brand,
          unit: null,
          confidence: 0.95,
          status: "ok",
          panel_source: "front",
        });
      }

      return {
        ok: true,
        result: {
          ...validated.data,
          fields: scannedFields,
        },
        fields: scannedFields,
        detected_panels: validated.data.detected_panels,
        product_summary: validated.data.product_summary,
        message:
          scannedFields.length === 0
            ? "No readable packaging text or declared fields detected in the image."
            : undefined,
      };
    }

    // Flexible extraction: normalize whatever JSON structure Gemini produced
    console.warn("Zod validation notice on Gemini output:", validated.error.issues);
    const normalized = normalizeGeminiOutput(parsed, titleHint);

    return {
      ok: true,
      result: normalized,
      fields: normalized.fields,
      detected_panels: normalized.detected_panels,
      product_summary: normalized.product_summary,
      message:
        normalized.fields.length === 0
          ? "No readable packaging text or declared fields detected in the image."
          : undefined,
    };
  } catch (err: any) {
    console.error("Gemini Vision extraction error:", err);
    throw new Error(err.message || "Gemini packaging extraction failed");
  }
}
