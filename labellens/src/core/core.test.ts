// Unit tests for the pure core logic: permission matrix, status machine, upload validation, stub extractor.
import { describe, it, expect } from "vitest";
import { can, isRole } from "./roles";
import { canTransition, assertTransition } from "./scanStatus";
import { validateUpload, MAX_UPLOAD_BYTES } from "./uploadValidation";
import { stubExtract } from "./stubExtractor";

describe("permission matrix", () => {
  it("lets only inspectors read all scans and the audit log", () => {
    expect(can("inspector", "scan.read.all")).toBe(true);
    expect(can("inspector", "audit.read")).toBe(true);
    for (const r of ["customer", "manufacturer"]) {
      expect(can(r, "scan.read.all")).toBe(false);
      expect(can(r, "audit.read")).toBe(false);
    }
  });
  it("denies unknown or missing roles", () => {
    expect(can(null, "scan.create")).toBe(false);
    expect(can("admin", "scan.create")).toBe(false);
    expect(isRole("hacker")).toBe(false);
  });
  it("lets every role create scans and upload images", () => {
    for (const r of ["customer", "manufacturer", "inspector"]) {
      expect(can(r, "scan.create")).toBe(true);
      expect(can(r, "image.upload")).toBe(true);
    }
  });
});

describe("scan status machine", () => {
  it("allows the normal happy path", () => {
    expect(canTransition("uploaded", "processing")).toBe(true);
    expect(canTransition("processing", "needs_review")).toBe(true);
    expect(canTransition("needs_review", "reviewed")).toBe(true);
  });
  it("blocks skipping steps and leaving a completed scan", () => {
    expect(canTransition("uploaded", "completed")).toBe(false);
    expect(canTransition("completed", "processing")).toBe(false);
    expect(() => assertTransition("uploaded", "reviewed")).toThrow();
  });
  it("allows retry after failure", () => {
    expect(canTransition("failed", "processing")).toBe(true);
  });
});

describe("upload validation", () => {
  const jpegHead = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0]);
  it("accepts a valid JPEG", () => {
    expect(validateUpload({ mime: "image/jpeg", size: 1000, panel: "front", head: jpegHead }).ok).toBe(true);
  });
  it("rejects wrong type, oversize, empty, unknown panel", () => {
    expect(validateUpload({ mime: "application/pdf", size: 10, panel: "front" }).ok).toBe(false);
    expect(validateUpload({ mime: "image/png", size: MAX_UPLOAD_BYTES + 1, panel: "front" }).ok).toBe(false);
    expect(validateUpload({ mime: "image/png", size: 0, panel: "front" }).ok).toBe(false);
    expect(validateUpload({ mime: "image/png", size: 10, panel: "back" }).ok).toBe(false);
  });
  it("rejects a file whose bytes are not an image even if the mime says so", () => {
    expect(validateUpload({ mime: "image/jpeg", size: 10, panel: "front", head: new Uint8Array(10) }).ok).toBe(false);
  });
});

describe("stub extractor", () => {
  it("never invents missing values: missing fields have null value and zero confidence", () => {
    const f = stubExtract("nutrition").find((x) => x.status === "missing")!;
    expect(f.value).toBeNull();
    expect(f.confidence).toBe(0);
  });
  it("returns fields for every panel", () => {
    for (const p of ["front", "ingredients", "nutrition", "declaration"] as const) expect(stubExtract(p).length).toBeGreaterThan(0);
  });
});
