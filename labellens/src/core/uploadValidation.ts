// Upload validation: checks file type, size, and panel name before a photo is accepted (runs on the server).
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB limit per photo
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const PANELS = ["front", "ingredients", "nutrition", "declaration", "full_pack"] as const;
export type Panel = (typeof PANELS)[number];

// Result type: either valid, or invalid with a human-readable reason.
export type ValidationResult = { ok: true } | { ok: false; reason: string };

// Validates the declared mime type, the byte size, and the panel; also sniffs magic bytes so a renamed file is rejected.
export function validateUpload(input: { mime: string; size: number; panel: string; head?: Uint8Array }): ValidationResult {
  if (!(PANELS as readonly string[]).includes(input.panel)) return { ok: false, reason: "Unknown panel type" };
  if (!(ALLOWED_MIME as readonly string[]).includes(input.mime)) return { ok: false, reason: "Only JPEG, PNG or WebP images are allowed" };
  if (input.size <= 0) return { ok: false, reason: "Empty file" };
  if (input.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "File is larger than 8 MB" };
  if (input.head && !looksLikeImage(input.head)) return { ok: false, reason: "File content is not a valid image" };
  return { ok: true };
}

// Checks the first bytes of a file for JPEG, PNG or WebP signatures.
export function looksLikeImage(b: Uint8Array): boolean {
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45;
  return jpeg || png || webp;
}
