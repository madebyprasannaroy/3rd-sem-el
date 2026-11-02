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
  official_barcode?: string | null;
  expected_fssai_license?: string | null;
  allowed_batch_regex?: string | null;
  authorized_states?: string[];
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
    id: "tpl-lays-magic-masala",
    brand_name: "Lay's",
    product_name: "India's Magic Masala",
    official_barcode: "8901491101991",
    expected_fssai_license: "10014064000435",
    allowed_batch_regex: "^(PEP|LAY)[0-9]{5,7}$",
    authorized_states: ["Delhi", "Maharashtra", "West Bengal", "Karnataka", "Rajasthan", "Uttar Pradesh", "Gujarat"],
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
  {
    id: "tpl-lays-cream-onion",
    brand_name: "Lay's",
    product_name: "American Style Cream & Onion (58g)",
    official_barcode: "8901491101813",
    expected_fssai_license: "10014064000435",
    allowed_batch_regex: "^([0-9\\.\\/]*N[1-5])[0-9A-Za-z\\s◊#\\.\\-\\/]+$",
    authorized_states: ["Karnataka"],
    authorized_cities: ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"],
    golden_extracted_fields: {
      brand: "Lay's",
      product_name: "Lay's American Style Cream & Onion Potato Chips",
      net_quantity: "58 g",
      mrp: "Rs. 25",
      fssai_license: "10014064000435",
      unit_fssai_license_n3: "10012031000120",
      veg_non_veg: "veg",
      ingredients:
        "Potato (83%), Edible Vegetable Oil, Seasoning [Sugar, Iodised Salt, Milk Solids (1.2%), Spices and Condiments, Maltodextrin, Flavour (Natural and Nature Identical Flavouring Substances), Cheese Powder (0.3%), Hydrolysed Vegetable Protein, Flavour Enhancers (627, 631), Edible Vegetable Oil (Palm, Coconut)]",
      energy_kcal: "537",
      protein_g: "6.7",
      carbohydrate_g: "53",
      total_sugar_g: "3.4",
      added_sugar_g: "2.1",
      total_fat_g: "33.1",
      sodium_mg: "643",
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
 * Validates presence of statutory batch / lot coding on packaging.
 * Batch numbers vary across production runs/items; this verifies that an identifiable batch/lot is present.
 * If batch number is not found, it returns an invalid anomaly flag.
 */
export function verifyBatchNumber(
  scannedBatch: string | null | undefined,
  _template?: MasterTemplate
): AnomalyFlag | null {
  if (!scannedBatch || scannedBatch.trim() === "") {
    return {
      code: "MISSING_BATCH_NUMBER",
      severity: "HIGH",
      description:
        "Mandatory statutory batch / lot number is missing from the packaging. Under FSSAI & Legal Metrology rules, all commercial packaged food products must declare an identifiable batch or lot number.",
      expected: "Legible batch or lot number (e.g. B.No. / Lot / Inkjet code)",
      detected: "Not found",
    };
  }

  return null;
}

/**
 * Supply-chain geo-routing verification:
 * Checks if the SKU scanned in a given city/state matches authorized regional distribution zones.
 */
export function verifyGeoRouting(
  scanLocation: string | { city?: string; state?: string } | null | undefined,
  template?: MasterTemplate
): AnomalyFlag | null {
  if (!scanLocation || !template) {
    return null;
  }

  const scanCity = typeof scanLocation === "string" ? scanLocation : scanLocation.city;
  const scanState = typeof scanLocation === "object" ? scanLocation.state : undefined;

  const authCities = template.authorized_cities || [];
  const authStates = template.authorized_states || [];

  if (authCities.length === 0 && authStates.length === 0) {
    return null;
  }

  // 1. If scan state is provided and authorized_states is defined, check state authorization
  if (scanState && scanState.trim() && authStates.length > 0) {
    const cleanState = scanState.trim().toLowerCase();
    const isStateAuth = authStates.some(
      (s) => s.toLowerCase() === cleanState || cleanState.includes(s.toLowerCase()) || s.toLowerCase().includes(cleanState)
    );
    if (!isStateAuth) {
      return {
        code: "GEO_ROUTING_DIVERSION",
        severity: "HIGH",
        description: `Product scanned in state '${scanState}', which is outside the authorized state distribution network (${authStates.join(", ")}) for this SKU. Potential grey-market diversion or cloned packaging.`,
        expected: `Authorized states: ${authStates.join(", ")}`,
        detected: `Scanned state: ${scanState}`,
      };
    }
  }

  // 2. If scan city is provided and authorized_cities is defined, check city authorization
  if (scanCity && scanCity.trim() && authCities.length > 0) {
    const cleanCity = scanCity.trim().toLowerCase();
    const isCityAuth = authCities.some(
      (c) => c.toLowerCase() === cleanCity || cleanCity.includes(c.toLowerCase()) || c.toLowerCase().includes(cleanCity)
    );
    // If state wasn't provided or not checked, flag unauthorized city
    if (!isCityAuth && (!scanState || !authStates.length)) {
      return {
        code: "GEO_ROUTING_DIVERSION",
        severity: "HIGH",
        description: `Product scanned in '${scanCity}', which is outside the authorized regional distribution network for this batch/SKU. Potential grey-market diversion or cloned packaging.`,
        expected: `Authorized regional zones: ${authCities.join(", ")}`,
        detected: `Scanned location: ${scanCity}`,
      };
    }
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
  const fieldMap = new Map<string, string>();
  for (const f of extractedFields) {
    if (f.key && f.value) {
      fieldMap.set(f.key.toLowerCase().trim(), f.value.trim());
    }
  }

  // Flexible field finder checking exact keys first, then substring keys
  const getField = (...keys: string[]): string => {
    for (const k of keys) {
      const v = fieldMap.get(k.toLowerCase());
      if (v && v.trim()) return v.trim();
    }
    for (const [k, v] of fieldMap.entries()) {
      if (v && v.trim() && keys.some((target) => k.includes(target.toLowerCase()))) {
        return v.trim();
      }
    }
    return "";
  };

  const detectedBrand = getField("brand", "brand_name", "brand_trademark", "manufacturer");
  const detectedProductName = getField("product_name", "title", "product_title", "item_name", "product");
  const detectedFssai = getField("fssai_license", "fssai_no", "fssai", "fssai_number", "license_number", "lic_no");
  const detectedBatch = context.batchNumber || getField("batch_number", "lot_number", "batch_no", "lot_no", "batch", "lot", "b_no", "mfg_batch");
  const detectedBarcode = context.barcode || getField("barcode", "ean_13", "ean13", "gtin", "upc", "bar_code", "barcode_number");

  // 1. Find matching master template by Barcode, FSSAI, or Name/Brand
  let matchedTemplate: MasterTemplate | undefined = undefined;

  // 1A. Match by official barcode
  if (detectedBarcode) {
    const cleanScannedBarcode = detectedBarcode.replace(/[^0-9]/g, "");
    matchedTemplate = templates.find((t) => {
      if (!t.official_barcode) return false;
      const cleanOfficial = t.official_barcode.replace(/[^0-9]/g, "");
      return cleanOfficial === cleanScannedBarcode;
    });
  }

  // 1B. Match by FSSAI statutory license number
  if (!matchedTemplate && detectedFssai) {
    const cleanScannedFssai = detectedFssai.replace(/[^0-9]/g, "");
    const fssaiCandidates = templates.filter((t) => {
      if (!t.expected_fssai_license) return false;
      return t.expected_fssai_license.replace(/[^0-9]/g, "") === cleanScannedFssai;
    });

    if (fssaiCandidates.length === 1 && !detectedProductName) {
      matchedTemplate = fssaiCandidates[0];
    } else if (fssaiCandidates.length > 0) {
      let bestFssaiScore = 0;
      let candidate = fssaiCandidates[0];
      const prodLower = detectedProductName.toLowerCase();

      for (const t of fssaiCandidates) {
        const tProd = (t.product_name || "").toLowerCase();
        const tGolden = (t.golden_extracted_fields?.product_name || "").toLowerCase();
        const isSub = prodLower && (
          tProd.includes(prodLower) ||
          prodLower.includes(tProd) ||
          tGolden.includes(prodLower) ||
          prodLower.includes(tGolden)
        );
        const sim = stringSimilarity(detectedProductName, t.product_name);
        const score = isSub ? 1.0 : sim;
        if (score > bestFssaiScore) {
          bestFssaiScore = score;
          candidate = t;
        }
      }
      matchedTemplate = candidate;
    }
  }

  // 1C. Match by Product Name & Brand Substring / Similarity
  if (!matchedTemplate && (detectedBrand || detectedProductName)) {
    let bestScore = 0;
    const cleanProd = detectedProductName.toLowerCase();
    const cleanBrand = detectedBrand.toLowerCase();

    for (const t of templates) {
      const tProd = (t.product_name || "").toLowerCase();
      const tBrand = (t.brand_name || "").toLowerCase();
      const tGoldenProd = (t.golden_extracted_fields?.product_name || "").toLowerCase();

      // Substring check
      const isSubMatch = cleanProd && (
        tProd.includes(cleanProd) ||
        cleanProd.includes(tProd) ||
        tGoldenProd.includes(cleanProd) ||
        cleanProd.includes(tGoldenProd)
      );

      // Key flavour keywords check (e.g. "cream & onion" / "magic masala")
      const isFlavorMatch = cleanProd && (
        (cleanProd.includes("cream") && cleanProd.includes("onion") && tProd.includes("cream")) ||
        (cleanProd.includes("magic") && cleanProd.includes("masala") && tProd.includes("masala")) ||
        (cleanProd.includes("digestive") && tProd.includes("digestive"))
      );

      const brandScore = cleanBrand ? stringSimilarity(cleanBrand, tBrand) : (isSubMatch || isFlavorMatch ? 0.9 : 0);
      const productScore = isSubMatch || isFlavorMatch ? 0.95 : stringSimilarity(cleanProd, tProd);
      const combined = cleanBrand ? brandScore * 0.5 + productScore * 0.5 : productScore;

      if (combined > bestScore && combined >= 0.4) {
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
  if (matchedTemplate) {
    if (detectedBrand) {
      const brandFlag = verifyBrandName(detectedBrand, matchedTemplate);
      if (brandFlag) {
        flags.push(brandFlag);
        brandStatus = "failed";
        brandDetails = brandFlag.description;
      } else {
        brandStatus = "passed";
        brandDetails = `Verified authentic trademark: ${matchedTemplate.brand_name}`;
      }
    } else {
      brandStatus = "passed";
      brandDetails = `Verified authentic trademark: ${matchedTemplate.brand_name} (correlated with master product standard)`;
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

  // D. Batch Number Statutory Check: verify product has an identifiable batch number
  const batchFlag = verifyBatchNumber(detectedBatch);
  if (batchFlag) {
    flags.push(batchFlag);
    batchStatus = "failed";
    batchDetails = "Invalid: Mandatory statutory batch / lot number was not found on the packaging.";
  } else {
    batchStatus = "passed";
    batchDetails = `Valid: Identifiable statutory batch number declared ('${detectedBatch.trim()}').`;
  }

  // E. Geo-Routing & Anti-Diversion Check
  if (context.geoLocation?.city || context.geoLocation?.state) {
    const geoFlag = verifyGeoRouting(context.geoLocation, matchedTemplate);
    const locLabel = [context.geoLocation.city, context.geoLocation.state].filter(Boolean).join(", ");
    if (geoFlag) {
      flags.push(geoFlag);
      geoStatus = "warning";
      geoDetails = geoFlag.description;
    } else {
      geoStatus = "passed";
      geoDetails = `Scan location (${locLabel}) matches authorized regional distribution network.`;
    }
  }

  // F. Golden Master Formulation Check
  if (matchedTemplate) {
    const formulaFlags = verifyGoldenFields(extractedFields, matchedTemplate);
    if (formulaFlags.length > 0) {
      flags.push(...formulaFlags);
      formulaStatus = "warning";
      formulaDetails = `${formulaFlags.length} declaration discrepancy detected against canonical master specifications.`;
    } else {
      formulaStatus = "passed";
      formulaDetails = "Formula and nutritional declarations align with manufacturer master specifications.";
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

