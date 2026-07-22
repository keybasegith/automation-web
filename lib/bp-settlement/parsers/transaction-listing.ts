/**
 * Parser for the Winfund "TRUST ACCOUNT LISTING" (and the equivalent Fundserv
 * transaction listing) from extracted text — works on OCR'd screenshots and
 * text-based PDFs.
 *
 * The listing is a regular table:
 *   CLIENT NAME | FUND | CODE | TRANSACTION TYPE / TYPE 2 | TRANSACTION STATUS | AMOUNT
 * where FUND is the supplier code (ATL/MFC/FID…), CODE is the fund number, and
 * TRANSACTION STATUS is the settled/not-settled status. Each Buy/Sell row is
 * read by pattern, and the printed "TOTAL FOR DATE" is used to self-check OCR
 * quality (a row-sum mismatch is surfaced as a warning). Client names are not
 * used for matching and are never emitted.
 */

import { parseAmountToCents } from "@/lib/net-settlement/money";
import { normalizeTransactionType, normalizeAmount, detectCurrency } from "../normalize";
import type {
  NormalizedTransaction,
  TransactionSource,
  SettlementFileType,
} from "../types";

const MONEY = /\(?-?\$?\s?[\d,]+\.\d{2}\)?/g;

export interface ListingMeta {
  fileName: string;
  documentType: SettlementFileType;
  source: TransactionSource;
  page?: number;
  sheet?: string;
  /** Lower base confidence for OCR-sourced text. */
  confidence?: number;
}

export interface ListingResult {
  transactions: NormalizedTransaction[];
  settlementDate: string | null;
  declaredTotalCents: number | null;
  sumCents: number;
  usdExcludedCount: number;
  warnings: string[];
}

function parseSettledDate(text: string): string | null {
  let m = text.match(/settled[:\s]+(\d{1,2})-(\d{1,2})-(\d{4})/i); // MM-DD-YYYY
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  m = text.match(/settled[:\s]+(\d{4})-(\d{1,2})-(\d{1,2})/i); // YYYY-MM-DD
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return null;
}

export function parseTransactionListing(rawText: string, meta: ListingMeta): ListingResult {
  const text = rawText.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const warnings: string[] = [];
  const baseConf = meta.confidence ?? 0.6;

  const curRaw = text.match(/currency:\s*([a-z. ]*dollar)/i)?.[1] ?? "";
  const currency = detectCurrency(curRaw);
  const settlementDate = parseSettledDate(text);

  const totalMatch =
    text.match(/total\s+for\s+date\s*:?\s*\$?([\d,]+\.\d{2})/i) ??
    text.match(/total\s+inflow\s*:?\s*\$?([\d,]+\.\d{2})/i);
  const declaredTotalCents = totalMatch ? parseAmountToCents(totalMatch[1]) : null;

  const transactions: NormalizedTransaction[] = [];
  let usdExcludedCount = 0;
  let sumCents = 0;

  const lines = text.split("\n");
  lines.forEach((line, li) => {
    const typeM = line.match(/(buy|sell)\s+of\s+shares/i);
    if (!typeM || typeM.index === undefined) return;
    const type = normalizeTransactionType(typeM[0]);
    if (!type) return;

    if (currency === "USD") {
      usdExcludedCount++;
      return;
    }

    const monies = line.match(MONEY);
    if (!monies) return;
    const amountCents = parseAmountToCents(monies[monies.length - 1]);
    if (amountCents === null) return;

    // Columns before the type are: [client name] FUND CODE.
    const before = line.slice(0, typeM.index);
    const supplier = (before.match(/\b[A-Z]{2,5}\b/g) ?? []).pop() ?? undefined; // FUND code
    const code = (before.match(/\b\d{2,6}\b/g) ?? []).pop() ?? undefined; // fund number
    // Status is the text between the type and the amount.
    const afterType = line.slice(typeM.index + typeM[0].length).replace(MONEY, " ");
    const status = afterType.replace(/\s+/g, " ").trim() || undefined;

    transactions.push({
      id: `${meta.fileName}:L${li + 1}`,
      source: meta.source,
      sourceFileName: meta.fileName,
      sourcePage: meta.page,
      sourceRow: li + 1,
      sourceSheet: meta.sheet,
      settlementDate: settlementDate ?? undefined,
      currency: "CAD",
      supplierCode: supplier,
      fundCode: code,
      transactionType: type,
      settlementStatus: status,
      originalAmountCents: amountCents,
      normalizedAmountCents: normalizeAmount(amountCents),
      extractionConfidence: baseConf,
      rawData: { line: line.trim() },
    });
    sumCents += normalizeAmount(amountCents);
  });

  if (currency === "USD") warnings.push("USD listing detected and excluded.");
  if (declaredTotalCents !== null && Math.abs(declaredTotalCents - sumCents) > 1) {
    warnings.push(
      `Extracted row total ($${(sumCents / 100).toFixed(2)}) does not match the listing's printed total ($${(declaredTotalCents / 100).toFixed(2)}). Some rows may have been misread — verify against the source.`
    );
  }

  return { transactions, settlementDate, declaredTotalCents, sumCents, usdExcludedCount, warnings };
}
