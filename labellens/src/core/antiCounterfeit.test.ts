import { describe, it, expect } from "vitest";
import {
  verifyBarcode,
  verifyFssaiLicense,
  verifyBrandName,
  verifyBatchNumber,
  verifyGeoRouting,
  evaluateAntiCounterfeit,
  DEFAULT_MASTER_TEMPLATES,
} from "./antiCounterfeit";

describe("Anti-Counterfeit Fraud Detection Engine", () => {
  const britanniaTemplate = DEFAULT_MASTER_TEMPLATES[0];

  it("validates authentic barcode and catches check digit mismatch", () => {
    // Valid barcode
    expect(verifyBarcode("8901063142213", britanniaTemplate)).toBeNull();

    // Check digit corruption (ends in 4 instead of 3)
    const flag = verifyBarcode("8901063142214", britanniaTemplate);
    expect(flag).not.toBeNull();
    expect(flag?.code).toBe("INVALID_BARCODE_CHECKSUM");
    expect(flag?.severity).toBe("CRITICAL");
  });

  it("catches FSSAI length anomalies and license mismatches", () => {
    // Valid 14-digit
    expect(verifyFssaiLicense("10015043001129", britanniaTemplate)).toBeNull();

    // Invalid length (10 digits)
    const lengthFlag = verifyFssaiLicense("1001504300", britanniaTemplate);
    expect(lengthFlag?.code).toBe("FSSAI_LENGTH_INVALID");

    // License mismatch (unlicensed clone)
    const mismatchFlag = verifyFssaiLicense("19999999999999", britanniaTemplate);
    expect(mismatchFlag?.code).toBe("FSSAI_LICENSE_MISMATCH");
    expect(mismatchFlag?.severity).toBe("CRITICAL");
  });

  it("detects brand typosquats and knock-offs via string similarity", () => {
    // Exact match
    expect(verifyBrandName("Britannia", britanniaTemplate)).toBeNull();

    // Knock-off typosquat: 'Britania'
    const typosquat = verifyBrandName("Britania", britanniaTemplate);
    expect(typosquat).not.toBeNull();
    expect(typosquat?.code).toBe("BRAND_TYPOSQUAT_DETECTED");
    expect(typosquat?.severity).toBe("CRITICAL");
  });

  it("verifies batch coding format against manufacturer regex", () => {
    // Valid format: BRT123456
    expect(verifyBatchNumber("BRT123456", britanniaTemplate)).toBeNull();

    // Invalid format: FAKE99
    const batchFlag = verifyBatchNumber("FAKE99", britanniaTemplate);
    expect(batchFlag?.code).toBe("BATCH_SYNTAX_ANOMALY");
    expect(batchFlag?.severity).toBe("HIGH");
  });

  it("verifies authorized geo-routing cities and flags diversions", () => {
    // Authorized city
    expect(verifyGeoRouting("Mumbai", britanniaTemplate)).toBeNull();

    // Unauthorized city
    const geoFlag = verifyGeoRouting("Guwahati", britanniaTemplate);
    expect(geoFlag?.code).toBe("GEO_ROUTING_DIVERSION");
    expect(geoFlag?.severity).toBe("HIGH");
  });

  it("verifies authorized states and flags interstate diversion", () => {
    // Authorized state: Karnataka
    expect(verifyGeoRouting({ state: "Karnataka" }, britanniaTemplate)).toBeNull();

    // Unauthorized state: Bihar
    const stateFlag = verifyGeoRouting({ state: "Bihar" }, britanniaTemplate);
    expect(stateFlag?.code).toBe("GEO_ROUTING_DIVERSION");
    expect(stateFlag?.severity).toBe("HIGH");
    expect(stateFlag?.description).toContain("outside the authorized state distribution network");
  });

  it("evaluates complete authentic product scan with high authenticity score", () => {
    const fields = [
      { key: "brand", value: "Britannia" },
      { key: "product_name", value: "NutriChoice Digestive" },
      { key: "fssai_license", value: "10015043001129" },
      { key: "net_quantity", value: "100 g" },
      { key: "veg_non_veg", value: "veg" },
    ];

    const assessment = evaluateAntiCounterfeit(fields, {
      barcode: "8901063142213",
      batchNumber: "BRT123456",
      geoLocation: { city: "Mumbai" },
    });

    expect(assessment.verdict).toBe("AUTHENTIC");
    expect(assessment.authenticity_score).toBeGreaterThanOrEqual(0.95);
    expect(assessment.flags).toHaveLength(0);
    expect(assessment.checks.fssaiCheck.status).toBe("passed");
    expect(assessment.checks.barcodeCheck.status).toBe("passed");
  });

  it("evaluates counterfeit product with typosquat and wrong FSSAI as CRITICAL_COUNTERFEIT_RISK", () => {
    const fields = [
      { key: "brand", value: "Britania" }, // typosquat
      { key: "product_name", value: "NutriChoice Digestive" },
      { key: "fssai_license", value: "12345678901234" }, // wrong license
    ];

    const assessment = evaluateAntiCounterfeit(fields, {
      batchNumber: "INVALID_BATCH",
      geoLocation: { city: "UnauthorizedTown" },
    });

    expect(assessment.verdict).toBe("CRITICAL_COUNTERFEIT_RISK");
    expect(assessment.authenticity_score).toBeLessThan(0.5);
    expect(assessment.flags.some((f) => f.code === "BRAND_TYPOSQUAT_DETECTED")).toBe(true);
    expect(assessment.flags.some((f) => f.code === "FSSAI_LICENSE_MISMATCH")).toBe(true);
  });
});

