/**
 * Anti-Counterfeit & Fake Product Detection Engine (LabelLens India Edition)
 * Pure, deterministic validation functions to cross-reference live OCR scan extractions
 * against verified brand master templates to detect knock-offs, cloned batches,
 * spelling anomalies (typosquats), unauthorized geo-diversions, and statutory licensing discrepancies.
 */

export type FlagSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type CounterfeitVerdict = "AUTHENTIC" | "SUSPECTED_FAKE" | "CRITICAL_COUNTERFEIT_RISK";

export interface AnomalyFlag {
  code: string;
  severity: FlagSeverity;
  description: string;
  expected: string;
  detected: string;
}

export interface MasterTemplate {
  id?: string;
  manufacturer_id?: string;
  brand_name: string;
  product_name: string;
  official_barcode?: string;
  expected_fssai_license?: string;
  allowed_batch_regex?: string;
  authorized_cities?: string[];
  golden_extracted_fields: Record<string, string | null>;
}

export interface CounterfeitAssessment {
  authenticity_score: number; // 0.00 to 1.00
  verdict: CounterfeitVerdict;
  flags: AnomalyFlag[];
  matched_template_id?: string;
  matched_brand?: string;
  checks: {
    brandCheck: { status: "passed" | "warning" | "failed" | "not_checked"; details: string };
    fssaiCheck: { status: "passed" | "warning" | "failed" | "not_checked"; details: string };
    barcodeCheck: { status: "passed" | "warning" | "failed" | "not_checked"; details: string };
    batchCheck: { status: "passed" | "warning" | "failed" | "not_checked"; details: string };
    geoCheck: { status: "passed" | "warning" | "failed" | "not_checked"; details: string };
    formulaCheck: { status: "passed" | "warning" | "failed" | "not_checked"; details: string };
  };
}

export interface ScanContext {
  barcode?: string;
  batchNumber?: string;
  geoLocation?: {
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  };
}

// BUILT-IN GOLDEN MASTER TEMPLATES (for offline & demo evaluation)
export const DEFAULT_MASTER_TEMPLATES: MasterTemplate[] = [
  {
    id: "tpl-britannia-digestive",
    brand_name: "Britannia",
    product_name: "NutriChoice Digestive",
    official_barcode: "8901063142213",
    expected_fssai_license: "10015043001129",
    allowed_batch_regex: "^(BRT|NT)[0-9]{6}[A-Z]?$",
    authorized_cities: ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune"],
    golden_extracted_fields: {
      product_name: "NutriChoice Digestive High Fibre",
      brand: "Britannia",
      net_quantity: "100 g",
      fssai_license: "10015043001129",
      veg_non_veg: "veg",
      ingredients:
        "Refined Wheat Flour (Maida 55%), Edible Vegetable Oil (Refined Palm Oil), Sugar, Wheat Bran (4.5%), Invert Sugar Syrup, Raising Agents [INS 503(ii), INS 500(ii)], Iodised Salt",
      energy_kcal: "482",
      protein_g: "8.2",
      total_sugar_g: "22.0",
      sodium_mg: "280",
    },
  },
  {
    id: "tpl-lays-magic-masala",
    brand_name: "Lay's",
    product_name: "India's Magic Masala",
    official_barcode: "8901491101991",
    expected_fssai_license: "10014064000435",
    allowed_batch_regex: "^(PEP|LAY)[0-9]{5,7}$",
    authorized_cities: ["Delhi", "Mumbai", "Kolkata", "Bengaluru", "Jaipur", "Lucknow", "Ahmedabad"],
    golden_extracted_fields: {
      product_name: "Lay's India's Magic Masala Potato Chips",
      brand: "Lay's",
      net_quantity: "50 g",
      fssai_license: "10014064000435",
      veg_non_veg: "veg",
      ingredients:
        "Potato, Edible Vegetable Oil (Palmolein), Seasoning (Spices and Condiments, Iodized Salt, Sugar, Black Salt, Tomato Powder, Onion Powder, Garlic Powder)",
      energy_kcal: "555",
      protein_g: "7.0",
      total_sugar_g: "3.5",
      sodium_mg: "887",
    },
  },
];

/**
 * Standard Levenshtein Distance algorithm to detect typosquats and knock-off names.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalized string similarity score between 0.0 and 1.0.
 */
export function stringSimilarity(a: string, b: string): number {
  const cleanA = a.toLowerCase().trim();
  const cleanB = b.toLowerCase().trim();
  if (cleanA === cleanB) return 1.0;
  const maxLen = Math.max(cleanA.length, cleanB.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(cleanA, cleanB);
  return 1.0 - dist / maxLen;
}

/**
 * Validates EAN-13 / UPC Barcode format and checks against Master Template.
 */
export function verifyBarcode(
  scannedBarcode: string | null | undefined,
  template?: MasterTemplate
): AnomalyFlag | null {
  if (!scannedBarcode || scannedBarcode.trim() === "") return null;
  const clean = scannedBarcode.replace(/[^0-9]/g, "");

  // EAN-13 Checksum verification
  if (clean.length === 13) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(clean[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    if (checkDigit !== parseInt(clean[12], 10)) {
      return {
        code: "INVALID_BARCODE_CHECKSUM",
        severity: "CRITICAL",
        description: "Scanned EAN-13 barcode has an invalid mathematical checksum digit (indicative of forged barcode artwork).",
        expected: `Valid GS1 EAN-13 checksum (expected digit ${checkDigit})`,
        detected: `Invalid check digit ${clean[12]} in barcode ${clean}`,
      };
    }
  }

  // Cross-reference with template if known
  if (template?.official_barcode) {
    const expected = template.official_barcode.replace(/[^0-9]/g, "");
    if (clean !== expected) {
      return {
        code: "BARCODE_MISMATCH",
        severity: "CRITICAL",
        description: `Scanned barcode does not match the registered GTIN/EAN for ${template.brand_name} ${template.product_name}.`,
        expected: template.official_barcode,
        detected: scannedBarcode,
      };
    }
  }

  return null;
}

/**
 * Validates Indian FSSAI 14-digit registration license number.
 */
export function verifyFssaiLicense(
  scannedFssai: string | null | undefined,
  template?: MasterTemplate
): AnomalyFlag | null {
  if (!scannedFssai || scannedFssai.trim() === "") return null;
  const clean = scannedFssai.replace(/[^0-9]/g, "");

  // 1. Indian FSSAI licenses must be exactly 14 digits
  if (clean.length !== 14) {
    return {
      code: "FSSAI_LENGTH_INVALID",
      severity: "HIGH",
      description: "Indian FSSAI license numbers must strictly consist of 14 numerical digits under FSSAI Regulations.",
      expected: "14-digit numerical license (e.g. 10015043001129)",
      detected: `${clean.length}-digit license string (${scannedFssai})`,
    };
  }

  // 2. Cross-reference with brand master template
  if (template?.expected_fssai_license) {
    const expected = template.expected_fssai_license.replace(/[^0-9]/g, "");
    if (clean !== expected) {
      return {
        code: "FSSAI_LICENSE_MISMATCH",
        severity: "CRITICAL",
        description: `Statutory FSSAI License does not match the registered manufacturer license for ${template.brand_name}. Packaging may be an unlicensed counterfeit.`,
        expected: template.expected_fssai_license,
        detected: scannedFssai,
      };
    }
  }

  return null;
}

/**
 * Validates batch / lot coding syntax against manufacturer regex.
 */
export function verifyBatchNumber(
  scannedBatch: string | null | undefined,
  template?: MasterTemplate
): AnomalyFlag | null {
  if (!scannedBatch || scannedBatch.trim() === "" || !template?.allowed_batch_regex) {
    return null;
  }

  try {
    const regex = new RegExp(template.allowed_batch_regex);
    if (!regex.test(scannedBatch.trim())) {
      return {
        code: "BATCH_SYNTAX_ANOMALY",
        severity: "HIGH",
        description: `Batch code '${scannedBatch}' fails official manufacturer lot format pattern '${template.allowed_batch_regex}'.`,
        expected: `Format matching pattern ${template.allowed_batch_regex}`,
        detected: scannedBatch,
      };
    }
  } catch {}

  return null;
}

/**
 * Supply-chain geo-routing verification:
 * Checks if the SKU scanned in a given city matches authorized regional distribution zones.
 */
export function verifyGeoRouting(
  scanCity: string | null | undefined,
  template?: MasterTemplate
): AnomalyFlag | null {
  if (!scanCity || scanCity.trim() === "" || !template?.authorized_cities || template.authorized_cities.length === 0) {
    return null;
  }

  const cleanCity = scanCity.trim().toLowerCase();
  const isAuthorized = template.authorized_cities.some(
    (c) => c.toLowerCase() === cleanCity || cleanCity.includes(c.toLowerCase()) || c.toLowerCase().includes(cleanCity)
  );

  if (!isAuthorized) {
    return {
      code: "GEO_ROUTING_DIVERSION",
      severity: "HIGH",
      description: `Product scanned in '${scanCity}', which is outside the authorized regional distribution network for this batch/SKU. Potential grey-market diversion or cloned packaging.`,
      expected: `Authorized regional zones: ${template.authorized_cities.join(", ")}`,
      detected: `Scanned location: ${scanCity}`,
    };
  }

  return null;
}

/**
 * Detects brand name typosquats (e.g., "Britania", "Layz", "Cadbery").
 */
export function verifyBrandName(
  scannedBrand: string | null | undefined,
  template: MasterTemplate
): AnomalyFlag | null {
  if (!scannedBrand || scannedBrand.trim() === "") return null;

  const sim = stringSimilarity(scannedBrand, template.brand_name);

  // If between 0.65 and 0.94 -> Very likely an intentional knock-off / spelling anomaly
  if (sim >= 0.65 && sim < 0.95) {
    return {
      code: "BRAND_TYPOSQUAT_DETECTED",
      severity: "CRITICAL",
      description: `Detected brand name '${scannedBrand}' is suspiciously close to authentic trademark '${template.brand_name}' (${Math.round(sim * 100)}% visual similarity). High risk of knock-off product.`,
      expected: template.brand_name,
      detected: scannedBrand,
    };
  }

  return null;
}

/**
 * Compares ingredients and declarations against canonical golden master fields.
 */
export function verifyGoldenFields(
  extractedFields: { key: string; value: string | null }[],
  template: MasterTemplate
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const fieldMap = new Map(extractedFields.map((f) => [f.key.toLowerCase(), f.value]));

  // Check Net Quantity
  const goldenQty = template.golden_extracted_fields["net_quantity"];
  const detectedQty = fieldMap.get("net_quantity");
  if (goldenQty && detectedQty) {
    const cleanGolden = goldenQty.toLowerCase().replace(/\s+/g, "");
    const cleanDetected = detectedQty.toLowerCase().replace(/\s+/g, "");
    if (cleanGolden !== cleanDetected && !cleanGolden.includes(cleanDetected) && !cleanDetected.includes(cleanGolden)) {
      flags.push({
        code: "NET_QUANTITY_DISCREPANCY",
        severity: "MEDIUM",
        description: "Declared net quantity differs from canonical master product specification.",
        expected: goldenQty,
        detected: detectedQty,
      });
    }
  }

  // Check Veg / Non-Veg emblem
  const goldenVeg = template.golden_extracted_fields["veg_non_veg"];
  const detectedVeg = fieldMap.get("veg_non_veg");
  if (goldenVeg && detectedVeg) {
    const isGoldenVeg = goldenVeg.toLowerCase().includes("veg") && !goldenVeg.toLowerCase().includes("non");
    const isDetectedVeg = detectedVeg.toLowerCase().includes("veg") && !detectedVeg.toLowerCase().includes("non");
    if (isGoldenVeg !== isDetectedVeg) {
      flags.push({
        code: "VEG_EMBLEM_MISMATCH",
        severity: "HIGH",
        description: "Statutory vegetarian/non-vegetarian symbol does not match the certified formulation.",
        expected: goldenVeg,
        detected: detectedVeg,
      });
    }
  }

  return flags;
}

/**
 * Main Evaluation Orchestrator:
 * Executes all anti-counterfeit tests and computes an Authenticity Score and Verdict.
 */
export function evaluateAntiCounterfeit(
  extractedFields: { key: string; value: string | null }[],
  context: ScanContext = {},
  templates: MasterTemplate[] = DEFAULT_MASTER_TEMPLATES
): CounterfeitAssessment {
  const fieldMap = new Map(extractedFields.map((f) => [f.key.toLowerCase(), f.value]));
  const detectedBrand = fieldMap.get("brand") || "";
  const detectedProductName = fieldMap.get("product_name") || "";
  const detectedFssai = fieldMap.get("fssai_license") || "";
  const detectedBatch = context.batchNumber || fieldMap.get("batch_number") || "";
  const detectedBarcode = context.barcode || fieldMap.get("barcode") || "";

  // 1. Find matching master template by brand or barcode
  let matchedTemplate: MasterTemplate | undefined = undefined;

  if (detectedBarcode) {
    matchedTemplate = templates.find((t) => t.official_barcode === detectedBarcode);
  }

  if (!matchedTemplate && (detectedBrand || detectedProductName)) {
    let bestScore = 0;
    for (const t of templates) {
      const brandScore = stringSimilarity(detectedBrand, t.brand_name);
      const productScore = stringSimilarity(detectedProductName, t.product_name);
      const combined = brandScore * 0.6 + productScore * 0.4;
      if (combined > bestScore && combined >= 0.5) {
        bestScore = combined;
        matchedTemplate = t;
      }
    }
  }

  const flags: AnomalyFlag[] = [];

  // Track individual subsystem statuses
  let brandStatus: "passed" | "warning" | "failed" | "not_checked" = "not_checked";
  let brandDetails = "No brand master match for comparison.";
  let fssaiStatus: "passed" | "warning" | "failed" | "not_checked" = "not_checked";
  let fssaiDetails = "No FSSAI license detected on packaging.";
  let barcodeStatus: "passed" | "warning" | "failed" | "not_checked" = "not_checked";
  let barcodeDetails = "No barcode scanned.";
  let batchStatus: "passed" | "warning" | "failed" | "not_checked" = "not_checked";
  let batchDetails = "No batch code provided.";
  let geoStatus: "passed" | "warning" | "failed" | "not_checked" = "not_checked";
  let geoDetails = "No scan geolocation captured.";
  let formulaStatus: "passed" | "warning" | "failed" | "not_checked" = "not_checked";
  let formulaDetails = "Formula matched canonical declarations.";

  // A. Brand Check
  if (matchedTemplate && detectedBrand) {
    const brandFlag = verifyBrandName(detectedBrand, matchedTemplate);
    if (brandFlag) {
      flags.push(brandFlag);
      brandStatus = "failed";
      brandDetails = brandFlag.description;
    } else {
      brandStatus = "passed";
      brandDetails = `Verified authentic trademark: ${matchedTemplate.brand_name}`;
    }
  }

  // B. FSSAI License Check
  if (detectedFssai) {
    const fssaiFlag = verifyFssaiLicense(detectedFssai, matchedTemplate);
    if (fssaiFlag) {
      flags.push(fssaiFlag);
      fssaiStatus = fssaiFlag.severity === "CRITICAL" ? "failed" : "warning";
      fssaiDetails = fssaiFlag.description;
    } else {
      fssaiStatus = "passed";
      fssaiDetails = `Valid 14-digit FSSAI statutory license (${detectedFssai})`;
    }
  }

  // C. Barcode Check
  if (detectedBarcode) {
    const barcodeFlag = verifyBarcode(detectedBarcode, matchedTemplate);
    if (barcodeFlag) {
      flags.push(barcodeFlag);
      barcodeStatus = "failed";
      barcodeDetails = barcodeFlag.description;
    } else {
      barcodeStatus = "passed";
      barcodeDetails = `Valid GS1 EAN-13 barcode: ${detectedBarcode}`;
    }
  }

  // D. Batch Number Check
  if (detectedBatch && matchedTemplate) {
    const batchFlag = verifyBatchNumber(detectedBatch, matchedTemplate);
    if (batchFlag) {
      flags.push(batchFlag);
      batchStatus = "failed";
      batchDetails = batchFlag.description;
    } else {
      batchStatus = "passed";
      batchDetails = `Batch code '${detectedBatch}' adheres to manufacturer pattern.`;
    }
  }

  // E. Geo-Routing & Anti-Diversion Check
  if (context.geoLocation?.city) {
    const geoFlag = verifyGeoRouting(context.geoLocation.city, matchedTemplate);
    if (geoFlag) {
      flags.push(geoFlag);
      geoStatus = "warning";
      geoDetails = geoFlag.description;
    } else {
      geoStatus = "passed";
      geoDetails = `Scan location (${context.geoLocation.city}) matches authorized regional distribution network.`;
    }
  }

  // F. Golden Master Formulation Check
  if (matchedTemplate) {
    const formulaFlags = verifyGoldenFields(extractedFields, matchedTemplate);
    if (formulaFlags.length > 0) {
      flags.push(...formulaFlags);
      formulaStatus = "warning";
      formulaDetails = `${formulaFlags.length} declaration discrepancy detected against canonical master specifications.`;
    }
  }

  // 2. Score Computation (Starts at 1.00, deducted per severity)
  let score = 1.0;
  for (const flag of flags) {
    switch (flag.severity) {
      case "CRITICAL":
        score -= 0.45;
        break;
      case "HIGH":
        score -= 0.25;
        break;
      case "MEDIUM":
        score -= 0.12;
        break;
      case "LOW":
        score -= 0.05;
        break;
    }
  }

  // If no template matched, cap confidence
  if (!matchedTemplate && flags.length === 0) {
    score = 0.88; // Unverified brand template
  }

  score = Math.max(0.0, Math.min(1.0, Math.round(score * 100) / 100));

  // 3. Verdict Determination
  let verdict: CounterfeitVerdict = "AUTHENTIC";
  const hasCritical = flags.some((f) => f.severity === "CRITICAL");
  const hasHigh = flags.some((f) => f.severity === "HIGH");

  if (hasCritical || score < 0.5) {
    verdict = "CRITICAL_COUNTERFEIT_RISK";
  } else if (hasHigh || score < 0.85) {
    verdict = "SUSPECTED_FAKE";
  } else {
    verdict = "AUTHENTIC";
  }

  return {
    authenticity_score: score,
    verdict,
    flags,
    matched_template_id: matchedTemplate?.id,
    matched_brand: matchedTemplate?.brand_name,
    checks: {
      brandCheck: { status: brandStatus, details: brandDetails },
      fssaiCheck: { status: fssaiStatus, details: fssaiDetails },
      barcodeCheck: { status: barcodeStatus, details: barcodeDetails },
      batchCheck: { status: batchStatus, details: batchDetails },
      geoCheck: { status: geoStatus, details: geoDetails },
      formulaCheck: { status: formulaStatus, details: formulaDetails },
    },
  };
}
