/**
 * Technical configuration only (spec §"SOURCE OF TRUTH REQUIREMENT"). These
 * values control behavior — accepted formats, size limits, tolerance, aliases —
 * and NEVER supply or replace financial transaction data.
 */

import type { SettlementFileType } from "./types";

/** Maximum accepted file size. Configurable via env; defaults to 25 MB. */
export const MAX_FILE_BYTES = (() => {
  const mb = Number(process.env.NEXT_PUBLIC_BP_SETTLEMENT_MAX_MB);
  return Number.isFinite(mb) && mb > 0 ? Math.round(mb * 1024 * 1024) : 25 * 1024 * 1024;
})();

export const MAX_FILE_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));

/**
 * Accepted upload formats. PDF and Excel parse most reliably; CSV is parsed
 * deterministically; images (screenshots) are read with on-device OCR — their
 * values carry lower confidence and should be verified against the source.
 */
export const ACCEPTED_EXTENSIONS = [".pdf", ".xlsx", ".xls", ".csv", ".png", ".jpg", ".jpeg"] as const;

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/jpg",
] as const;

/** Extensions read via on-device OCR (screenshots). */
export const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg"] as const;

/** Explicitly rejected formats with a helpful message. */
export const REJECTED_EXTENSIONS: Record<string, string> = {
  ".doc": "Word documents are not accepted. Upload the PDF, Excel, CSV, or a screenshot.",
  ".docx": "Word documents are not accepted. Upload the PDF, Excel, CSV, or a screenshot.",
  ".zip": "Archives are not accepted. Upload the individual files.",
  ".txt": "Plain text is not accepted. Upload the PDF, Excel, CSV, or a screenshot.",
  ".heic": "HEIC images are not supported. Upload a PNG or JPG screenshot, or the PDF/Excel/CSV.",
};

/** Amount comparison tolerance: CAD $0.01. */
export const AMOUNT_TOLERANCE_CENTS = 1;

/** Extraction confidence below this flags LOW_EXTRACTION_CONFIDENCE. */
export const LOW_CONFIDENCE_THRESHOLD = 0.4;

export interface DocumentSlot {
  fileType: SettlementFileType;
  label: string;
  description: string;
  formats: string;
  allowMultiple: boolean;
}

/** The three upload cards, in display order. */
export const DOCUMENT_SLOTS: DocumentSlot[] = [
  {
    fileType: "FUNDSERV_CATEGORY_SUMMARY",
    label: "Fundserv Category Summary",
    description: "Settlement Summary by Category (expected Buy/Sell totals).",
    formats: "PDF, Excel, CSV, image",
    allowMultiple: false,
  },
  {
    fileType: "FUNDSERV_DETAIL",
    label: "Fundserv Transaction Details",
    description: "Individual Buy/Sell rows. Add both files if Buy and Sell were exported separately.",
    formats: "PDF, Excel, CSV, image",
    allowMultiple: true,
  },
  {
    fileType: "WINFUND_UNSETTLED",
    label: "Winfund Not Settled Transactions",
    description: "Unsettled Winfund Buy/Sell transactions.",
    formats: "PDF, Excel, CSV, image",
    allowMultiple: false,
  },
];
