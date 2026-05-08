/**
 * Helpers for parsing the data URLs produced by the canvas-based SignaturePad.
 * Image upload itself lives in lib/pdf.ts (uploadSignatureImage) so all storage
 * concerns stay in one place.
 */

const DATA_URL_PATTERN = /^data:image\/(png|jpeg);base64,([a-z0-9+/=]+)$/i;

export interface ParsedSignature {
  ext: "png" | "jpeg";
  base64: string;
  byteLength: number;
}

export function parseSignatureDataUrl(value: unknown): ParsedSignature | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = DATA_URL_PATTERN.exec(trimmed);
  if (!match) return null;
  const ext = match[1].toLowerCase() as "png" | "jpeg";
  const base64 = match[2];
  // Each base64 char encodes 6 bits; padding adjusts. Approx is fine for a size cap.
  const byteLength = Math.floor((base64.length * 3) / 4);
  return { ext, base64, byteLength };
}

export function isValidSignatureDataUrl(value: unknown): value is string {
  return parseSignatureDataUrl(value) !== null;
}
