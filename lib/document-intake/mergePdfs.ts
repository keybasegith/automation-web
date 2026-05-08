import { PDFDocument } from "pdf-lib";
import { sanitizeFileName } from "./splitPdf";

/**
 * Document type values surfaced in the Merge tab dropdown. Kept in this file
 * so the route, the panel, and the auto-sort helper share a single source.
 *
 * The order of this list IS the recommended merge order used by
 * `RECOMMENDED_MERGE_ORDER` below.
 */
export const MERGE_DOCUMENT_TYPES = [
  "NAAF",
  "KYC",
  "CRQ",
  "Identity Document",
  "Passport",
  "Driver's License",
  "Statement",
  "Supporting Document",
  "Other",
] as const;
export type MergeDocumentType = (typeof MERGE_DOCUMENT_TYPES)[number];

/**
 * Recommended ordering applied by the "Auto-sort by recommended order" button.
 * Files of the same type retain their relative order (stable sort).
 */
export const RECOMMENDED_MERGE_ORDER: readonly MergeDocumentType[] = [
  "NAAF",
  "KYC",
  "CRQ",
  "Identity Document",
  "Passport",
  "Driver's License",
  "Statement",
  "Supporting Document",
  "Other",
];

const MERGE_ORDER_INDEX: Record<MergeDocumentType, number> =
  RECOMMENDED_MERGE_ORDER.reduce(
    (acc, type, idx) => {
      acc[type] = idx;
      return acc;
    },
    {} as Record<MergeDocumentType, number>
  );

/**
 * Stable-sort an array of `{ documentType }` items by the recommended order.
 * Items whose type is not in the canonical list are placed at the end.
 */
export function sortByRecommendedOrder<T extends { documentType: string }>(
  items: readonly T[]
): T[] {
  const indexed = items.map((item, originalIndex) => ({ item, originalIndex }));
  indexed.sort((a, b) => {
    const ai = MERGE_ORDER_INDEX[a.item.documentType as MergeDocumentType];
    const bi = MERGE_ORDER_INDEX[b.item.documentType as MergeDocumentType];
    const aRank = ai ?? Number.POSITIVE_INFINITY;
    const bRank = bi ?? Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    return a.originalIndex - b.originalIndex;
  });
  return indexed.map((x) => x.item);
}

export interface MergePdfInput {
  /** Bytes of one PDF file. */
  bytes: ArrayBuffer | Uint8Array;
  /** Optional label used for error messages only. */
  label?: string;
}

export interface MergePdfResult {
  bytes: Uint8Array;
  pageCount: number;
}

/**
 * Merge a list of PDF byte buffers, in order, into a single PDF.
 *
 * Deterministic and local — no external service is called. The merge is
 * page-for-page: pages are copied across with `copyPages`, preserving
 * embedded fonts and form fields where possible.
 */
export async function mergePdfs(
  inputs: readonly MergePdfInput[]
): Promise<MergePdfResult> {
  if (inputs.length < 2) {
    throw new Error("At least two PDF files are required to merge.");
  }
  const merged = await PDFDocument.create();

  for (const input of inputs) {
    let source: PDFDocument;
    try {
      // ignoreEncryption: true lets pdf-lib load PDFs with permission flags
      // set (e.g. "no printing / no copying" — extremely common on bank,
      // CRA, and certificate documents). Truly password-protected PDFs
      // (where the content is encrypted) cannot be merged at all and need
      // to be decrypted upstream; they'll surface as a parse error below.
      source = await PDFDocument.load(input.bytes, { ignoreEncryption: true });
    } catch (err) {
      const label = input.label ? ` (${input.label})` : "";
      const raw = err instanceof Error ? err.message : String(err);
      const friendly = /password/i.test(raw)
        ? "this PDF is password-protected — please remove the password and re-upload"
        : raw;
      throw new Error(`Could not read PDF${label}: ${friendly}`);
    }
    const pageIndexes = source.getPageIndices();
    const copied = await merged.copyPages(source, pageIndexes);
    copied.forEach((page) => merged.addPage(page));
  }

  const bytes = await merged.save();
  return { bytes, pageCount: merged.getPageCount() };
}

/**
 * Build the download filename for a merged package using the spec'd pattern:
 *
 *   {clientName}_{packageName | "Merged_Client_Package"}_{YYYY-MM-DD}.pdf
 *
 * Spaces are replaced with underscores and unsafe filesystem characters are
 * stripped. Trims to 200 chars to stay well under filename limits.
 */
export function buildMergedFilename(args: {
  clientName: string;
  packageName?: string | null;
  /** Defaults to today (UTC) if omitted. */
  date?: Date;
}): string {
  const datePart = (args.date ?? new Date()).toISOString().slice(0, 10);
  const slug = (s: string) =>
    s
      .replace(/[/\\:*?"<>|]+/g, "")
      .trim()
      .replace(/\s+/g, "_");
  const clientPart = slug(args.clientName) || "Client";
  const pkgRaw = args.packageName?.trim();
  const pkgPart = pkgRaw && pkgRaw.length > 0 ? slug(pkgRaw) : "Merged_Client_Package";
  const combined = `${clientPart}_${pkgPart}_${datePart}`;
  // Cap length defensively, then run through sanitizeFileName to ensure ".pdf".
  return sanitizeFileName(combined.slice(0, 196));
}
