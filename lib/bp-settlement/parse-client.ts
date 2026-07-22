/**
 * Browser-local parsing orchestration. Everything runs in the browser — no
 * upload, no third party. PDFs via pdfjs (text + table), Excel/CSV via SheetJS,
 * screenshots via on-device OCR. Produces either a Category Summary or a list of
 * Buy/Sell transactions, always with source traceability. Nothing is invented —
 * unreadable inputs are reported, not guessed.
 */

import { parseSettlementBytes, type ParsedSheet } from "@/lib/net-settlement/parse";
import { parsePdfBytes } from "@/lib/net-settlement/parsePdf";
import { extractPdfText } from "./parsers/pdf-text";
import { extractImageText } from "./parsers/ocr";
import { classifyFile } from "./file-classifier";
import { parseCategorySummary } from "./parsers/fundserv-summary";
import { parseTransactionListing } from "./parsers/transaction-listing";
import { mapWinfundSheet, mapFundservDetailSheet } from "./parsers/row-mappers";
import type {
  SettlementFileType,
  TransactionSource,
  NormalizedTransaction,
  FundservCategorySummary,
} from "./types";

export type ExtractionStatus = "parsed" | "manual_review" | "error";

export interface ParsedUpload {
  fileType: SettlementFileType;
  classificationConfidence: number;
  needsManualAssignment: boolean;
  extractionStatus: ExtractionStatus;
  category?: FundservCategorySummary;
  transactions: NormalizedTransaction[];
  detectedSettlementDate: string | null;
  pageOrRowCount: number;
  usdExcludedCount: number;
  warnings: string[];
  parsingErrors: string[];
  scanned: boolean;
}

const isPdf = (name: string) => /\.pdf$/i.test(name);
const isImage = (name: string) => /\.(png|jpe?g)$/i.test(name);

const OCR_VERIFY_WARNING =
  "Values were read from a screenshot using on-device OCR — verify them against the source file.";

function sourceFor(fileType: SettlementFileType): TransactionSource {
  return fileType === "WINFUND_UNSETTLED" ? "WINFUND" : "FUNDSERV";
}

function sheetToText(sheet: ParsedSheet): string {
  const header = sheet.headers.join(" ");
  const rows = sheet.rows.map((r) => Object.values(r.cells).map((v) => String(v ?? "")).join(" ")).join("\n");
  return `${header}\n${rows}`;
}

function detectDate(txs: NormalizedTransaction[]): string | null {
  const counts = new Map<string, number>();
  for (const t of txs) if (t.settlementDate) counts.set(t.settlementDate, (counts.get(t.settlementDate) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [d, c] of counts) if (c > n) { best = d; n = c; }
  return best;
}

function mapSheet(
  fileType: SettlementFileType,
  sheet: ParsedSheet,
  fileId: string,
  fileName: string
): { transactions: NormalizedTransaction[]; usd: number; warnings: string[] } {
  const r = fileType === "WINFUND_UNSETTLED"
    ? mapWinfundSheet(sheet, fileId, fileName)
    : mapFundservDetailSheet(sheet, fileId, fileName);
  return { transactions: r.transactions, usd: r.usdExcludedCount, warnings: r.warnings };
}

/** Build a transaction ParsedUpload from a set of extracted transactions. */
function txResult(
  fileType: SettlementFileType,
  confidence: number,
  needsManual: boolean,
  transactions: NormalizedTransaction[],
  usd: number,
  extraWarnings: string[],
  settlementDate: string | null
): ParsedUpload {
  return {
    fileType,
    classificationConfidence: confidence,
    needsManualAssignment: needsManual,
    extractionStatus: transactions.length > 0 ? "parsed" : "manual_review",
    transactions,
    detectedSettlementDate: settlementDate ?? detectDate(transactions),
    pageOrRowCount: transactions.length,
    usdExcludedCount: usd,
    warnings: extraWarnings,
    parsingErrors: transactions.length > 0 ? [] : ["No Buy/Sell transactions could be read from this file."],
    scanned: false,
    category: undefined,
  };
}

export async function parseUploadedFile(
  file: File,
  fileId: string,
  assignedType?: SettlementFileType
): Promise<ParsedUpload> {
  const bytes = await file.arrayBuffer();
  const warnings: string[] = [];
  const parsingErrors: string[] = [];
  const base: ParsedUpload = {
    fileType: "UNKNOWN",
    classificationConfidence: 0,
    needsManualAssignment: true,
    extractionStatus: "manual_review",
    transactions: [],
    detectedSettlementDate: null,
    pageOrRowCount: 0,
    usdExcludedCount: 0,
    warnings,
    parsingErrors,
    scanned: false,
  };

  // ---- Screenshot / image → on-device OCR ------------------------------
  if (isImage(file.name)) {
    const ocr = await extractImageText(bytes);
    warnings.push(...ocr.warnings);
    if (!ocr.text.trim()) {
      return { ...base, fileType: assignedType ?? "UNKNOWN", extractionStatus: "manual_review",
        parsingErrors: ["Could not read text from this image. Upload a clearer screenshot, or the PDF/Excel/CSV."] };
    }
    const cls = assignedType
      ? { fileType: assignedType, confidence: 1, needsManualAssignment: false }
      : classifyFile(ocr.text, { filename: file.name });

    if (cls.fileType === "FUNDSERV_CATEGORY_SUMMARY") {
      const category = parseCategorySummary(ocr.text, { fileName: file.name, documentType: "FUNDSERV_CATEGORY_SUMMARY", page: 1 });
      return { ...base, fileType: cls.fileType, classificationConfidence: Math.min(cls.confidence, ocr.confidence),
        needsManualAssignment: true, extractionStatus: category.parsed ? "parsed" : "manual_review", category, pageOrRowCount: 1,
        warnings: [...warnings, ...category.warnings, OCR_VERIFY_WARNING] };
    }

    // Winfund / Fundserv detail listing → pattern-parse the OCR text.
    const listing = parseTransactionListing(ocr.text, {
      fileName: file.name, documentType: cls.fileType, source: sourceFor(cls.fileType), page: 1, confidence: Math.min(0.6, ocr.confidence),
    });
    return txResult(cls.fileType === "UNKNOWN" ? "FUNDSERV_DETAIL" : cls.fileType,
      Math.min(cls.confidence, ocr.confidence), true, listing.transactions, listing.usdExcludedCount,
      [...warnings, ...listing.warnings, OCR_VERIFY_WARNING], listing.settlementDate);
  }

  // ---- PDF -------------------------------------------------------------
  if (isPdf(file.name)) {
    const text = await extractPdfText(bytes);
    if (!text.hasText) {
      return { ...base, fileType: assignedType ?? "UNKNOWN", scanned: true,
        parsingErrors: ["This PDF appears to be scanned or image-based. Please export it as an Excel file or a text-based PDF."] };
    }
    const cls = assignedType
      ? { fileType: assignedType, confidence: 1, needsManualAssignment: false }
      : classifyFile(text.text, { filename: file.name });

    if (cls.fileType === "FUNDSERV_CATEGORY_SUMMARY") {
      const category = parseCategorySummary(text.text, { fileName: file.name, documentType: "FUNDSERV_CATEGORY_SUMMARY", page: 1 });
      return { ...base, fileType: cls.fileType, classificationConfidence: cls.confidence,
        needsManualAssignment: cls.needsManualAssignment, extractionStatus: category.parsed ? "parsed" : "manual_review",
        category, pageOrRowCount: text.pages, warnings: [...warnings, ...category.warnings] };
    }

    // Listing (Trust Account Listing) from the PDF text first — more robust for
    // this report layout — then fall back to table reconstruction.
    const fileType = cls.fileType === "UNKNOWN" ? "FUNDSERV_DETAIL" : cls.fileType;
    const listing = parseTransactionListing(text.text, { fileName: file.name, documentType: fileType, source: sourceFor(fileType), confidence: 0.85 });
    if (listing.transactions.length > 0) {
      return txResult(fileType, cls.confidence, cls.needsManualAssignment, listing.transactions, listing.usdExcludedCount,
        [...warnings, ...listing.warnings], listing.settlementDate);
    }
    const table = await parsePdfBytes(bytes);
    warnings.push(...table.warnings);
    const sheet = table.sheets[0];
    if (!sheet) {
      return { ...base, fileType, classificationConfidence: cls.confidence, extractionStatus: "manual_review",
        parsingErrors: ["No transactions could be read from this PDF. Export it as Excel or CSV."] };
    }
    const mapped = mapSheet(fileType, sheet, fileId, file.name);
    return txResult(fileType, cls.confidence, cls.needsManualAssignment, mapped.transactions, mapped.usd,
      [...warnings, ...mapped.warnings], detectDate(mapped.transactions));
  }

  // ---- Excel / CSV -----------------------------------------------------
  const parsed = parseSettlementBytes(bytes, file.name);
  warnings.push(...parsed.warnings);
  const sheet = parsed.sheets[0];
  if (!sheet) {
    return { ...base, extractionStatus: "error", parsingErrors: ["No readable table found in this file."] };
  }
  const cls = assignedType
    ? { fileType: assignedType, confidence: 1, needsManualAssignment: false }
    : classifyFile(sheetToText(sheet), { headers: sheet.headers, filename: file.name });

  if (cls.fileType === "FUNDSERV_CATEGORY_SUMMARY") {
    const category = parseCategorySummary(sheetToText(sheet), { fileName: file.name, documentType: "FUNDSERV_CATEGORY_SUMMARY", sheet: sheet.name });
    return { ...base, fileType: cls.fileType, classificationConfidence: cls.confidence,
      needsManualAssignment: cls.needsManualAssignment, extractionStatus: category.parsed ? "parsed" : "manual_review",
      category, pageOrRowCount: sheet.rows.length, warnings: [...warnings, ...category.warnings] };
  }

  const fileType = cls.fileType === "UNKNOWN" ? "FUNDSERV_DETAIL" : cls.fileType;
  const mapped = mapSheet(fileType, sheet, fileId, file.name);
  if (mapped.transactions.length > 0) {
    return txResult(fileType, cls.confidence, cls.needsManualAssignment, mapped.transactions, mapped.usd,
      [...warnings, ...mapped.warnings], detectDate(mapped.transactions));
  }
  // Fallback: a listing-style export where the header row wasn't a clean table.
  const listing = parseTransactionListing(sheetToText(sheet), { fileName: file.name, documentType: fileType, source: sourceFor(fileType), sheet: sheet.name, confidence: 0.8 });
  return txResult(fileType, cls.confidence, cls.needsManualAssignment, listing.transactions, listing.usdExcludedCount,
    [...warnings, ...listing.warnings], listing.settlementDate);
}
