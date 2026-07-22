/**
 * Pure file-acceptance validation. PDF / Excel / CSV / image, configurable max
 * size. The extension is authoritative; MIME is advisory. Deterministic + testable.
 */

import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  REJECTED_EXTENSIONS,
} from "./constants";

export interface FileMeta {
  name: string;
  size: number;
  mimeType?: string;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  extension: string;
}

/** Strip path and collapse unsafe characters from an uploaded filename. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180);
}

export function extensionOf(name: string): string {
  const m = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : "";
}

export function validateFile(meta: FileMeta): ValidationResult {
  const ext = extensionOf(meta.name);

  if (ext in REJECTED_EXTENSIONS) {
    return { ok: false, error: REJECTED_EXTENSIONS[ext], extension: ext };
  }

  if (!ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number])) {
    return {
      ok: false,
      error: `Unsupported file type "${ext || "unknown"}". Accepted: PDF, Excel, CSV, or an image screenshot.`,
      extension: ext,
    };
  }

  // The extension is authoritative (browsers vary for .xls/.csv MIME types), so
  // MIME is advisory only and never used to reject an accepted extension.

  if (meta.size <= 0) {
    return { ok: false, error: "File is empty.", extension: ext };
  }
  if (meta.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `File exceeds the ${MAX_FILE_MB} MB limit.`,
      extension: ext,
    };
  }

  return { ok: true, extension: ext };
}
