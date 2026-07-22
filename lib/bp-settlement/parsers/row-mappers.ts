/**
 * Map parsed tabular rows (Excel or PDF-table) into NormalizedTransaction.
 *
 * Buy Shares / Sell of Shares, Canadian Dollar only. USD rows are excluded and
 * counted; out-of-scope types (cash distribution, commission, deposit) are
 * dropped. Every row keeps its source filename + row number for traceability.
 */

import type { ParsedSheet } from "@/lib/net-settlement/parse";
import {
  resolveHeaders,
  normalizeDate,
  normalizeCode,
  normalizeId,
  normalizeText,
  type ResolvedMapping,
} from "@/lib/net-settlement/normalize";
import { parseAmountToCents } from "@/lib/net-settlement/money";
import {
  normalizeTransactionType,
  normalizeAmount,
  isCanadianDollar,
  detectCurrency,
} from "../normalize";
import type { NormalizedTransaction } from "../types";

export interface MapResult {
  transactions: NormalizedTransaction[];
  usdExcludedCount: number;
  outOfScopeCount: number;
  warnings: string[];
  amountColumnFound: boolean;
}

// Winfund "Trust Account Listing" columns: CLIENT NAME | FUND | CODE |
// TRANSACTION TYPE / TYPE 2 | TRANSACTION STATUS | AMOUNT. Here FUND is the
// supplier code (ATL/MFC/FID…), CODE is the fund number, and the single status
// column ("TRANSACTION STATUS": "Settled (No Cheque)" / "Not Settled") is the
// settlement status. Legacy multi-column exports are also supported.
const WINFUND_ALIASES: Record<string, string[]> = {
  trustSettledDate: ["trust settled date", "settled date", "settlement date", "trust settle date"],
  supplier: ["fund", "supplier", "supplier code", "fund company"],
  fundNumber: ["code", "fund number", "fund #", "fund no", "fund code"],
  planId: ["plan id", "plan #", "plan number", "plan no"],
  workOrderNumber: ["w/o order number", "w o order number", "wo order number", "wire order #", "wire order number", "order number", "w/o order", "order #"],
  contractNumber: ["contract number", "contract #", "contract no", "contract"],
  transactionType: ["transaction type / type 2", "transaction type", "txn type", "trans type", "type"],
  amount: ["amount", "amt", "settled amount", "net amount"],
  settlementStatus: ["transaction status", "settlement status", "settle status", "settled status", "status"],
  bankCode: ["bank code", "bank", "bank id"],
  clientName: ["client name", "client's name", "clients name"],
  currency: ["currency", "curr", "ccy"],
};

const FUNDSERV_DETAIL_ALIASES: Record<string, string[]> = {
  supplier: ["supplier", "supplier code", "fund company", "source"],
  fundCode: ["fund code", "fund id", "fund #", "fund no", "fund"],
  planId: ["plan id", "dealer account id", "account id", "account", "plan #"],
  contractNumber: ["contract number", "contract #", "contract no", "contract"],
  workOrderNumber: ["order number", "order #", "order id", "order no", "w/o order number", "order"],
  transactionType: ["transaction type", "tx type", "trans type", "type"],
  transactionStatus: ["transaction status", "status", "trans status"],
  settlementDate: ["settlement date", "settle date", "trade date", "settlement dt"],
  amount: ["amount", "settlement amount", "settlement amt", "amt", "net amount"],
  currency: ["currency", "curr", "ccy"],
};

function fieldGetter(sheet: ParsedSheet, mapping: ResolvedMapping) {
  return (cells: Record<string, unknown>, field: string): unknown => {
    const idx = mapping.field[field];
    if (idx === undefined) return null;
    const header = sheet.headers[idx];
    return header === undefined ? null : cells[header] ?? null;
  };
}

function mappingConfidence(mapping: ResolvedMapping, required: string[]): number {
  const rank: Record<"high" | "medium" | "low", number> = { high: 1, medium: 0.7, low: 0.4 };
  const vals: number[] = required.map((f) => {
    const c = mapping.confidence[f];
    return c ? rank[c] : 0;
  });
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export function mapWinfundSheet(
  sheet: ParsedSheet,
  sourceFileId: string,
  sourceFileName: string
): MapResult {
  const mapping = resolveHeaders(sheet.headers, WINFUND_ALIASES);
  const get = fieldGetter(sheet, mapping);
  const baseConf = mappingConfidence(mapping, ["amount", "fundNumber", "planId", "transactionType"]);

  const transactions: NormalizedTransaction[] = [];
  let usdExcludedCount = 0;
  let outOfScopeCount = 0;

  sheet.rows.forEach((row, i) => {
    const c = row.cells;
    if (!isCanadianDollar(get(c, "currency"))) {
      usdExcludedCount++;
      return;
    }
    const type = normalizeTransactionType(get(c, "transactionType"));
    if (type === null) {
      outOfScopeCount++;
      return;
    }
    const originalAmountCents = parseAmountToCents(get(c, "amount"));
    if (originalAmountCents === null) return;

    transactions.push({
      id: `${sourceFileId}:W:${i + 1}`,
      source: "WINFUND",
      sourceFileName,
      sourceRow: row.rowNumber,
      sourceSheet: sheet.name,
      settlementDate: normalizeDate(get(c, "trustSettledDate")) ?? undefined,
      currency: "CAD",
      supplierCode: normalizeCode(get(c, "supplier")) ?? undefined,
      fundCode: normalizeCode(get(c, "fundNumber")) ?? undefined,
      planId: normalizeId(get(c, "planId")) ?? undefined,
      workOrderNumber: normalizeId(get(c, "workOrderNumber")) ?? undefined,
      contractNumber: normalizeId(get(c, "contractNumber")) ?? undefined,
      transactionType: type,
      transactionStatus: normalizeText(get(c, "transactionStatus")) ?? undefined,
      settlementStatus: normalizeText(get(c, "settlementStatus")) ?? undefined,
      originalAmountCents,
      normalizedAmountCents: normalizeAmount(originalAmountCents),
      extractionConfidence: Math.max(0.5, baseConf),
      rawData: c,
    });
  });

  const warnings: string[] = [];
  if (usdExcludedCount > 0) warnings.push(`${usdExcludedCount} USD row(s) excluded.`);
  if (outOfScopeCount > 0) warnings.push(`${outOfScopeCount} non Buy/Sell row(s) excluded.`);
  if (mapping.field.amount === undefined) warnings.push("No amount column could be identified.");
  return { transactions, usdExcludedCount, outOfScopeCount, warnings, amountColumnFound: mapping.field.amount !== undefined };
}

export function mapFundservDetailSheet(
  sheet: ParsedSheet,
  sourceFileId: string,
  sourceFileName: string
): MapResult {
  const mapping = resolveHeaders(sheet.headers, FUNDSERV_DETAIL_ALIASES);
  const get = fieldGetter(sheet, mapping);
  const baseConf = mappingConfidence(mapping, ["amount", "fundCode", "transactionType"]);

  const transactions: NormalizedTransaction[] = [];
  let usdExcludedCount = 0;
  let outOfScopeCount = 0;

  sheet.rows.forEach((row, i) => {
    const c = row.cells;
    if (detectCurrency(get(c, "currency")) === "USD") {
      usdExcludedCount++;
      return;
    }
    const type = normalizeTransactionType(get(c, "transactionType"));
    if (type === null) {
      outOfScopeCount++;
      return;
    }
    const originalAmountCents = parseAmountToCents(get(c, "amount"));
    if (originalAmountCents === null) return;

    transactions.push({
      id: `${sourceFileId}:F:${i + 1}`,
      source: "FUNDSERV",
      sourceFileName,
      sourceRow: row.rowNumber,
      sourceSheet: sheet.name,
      settlementDate: normalizeDate(get(c, "settlementDate")) ?? undefined,
      currency: "CAD",
      supplierCode: normalizeCode(get(c, "supplier")) ?? undefined,
      fundCode: normalizeCode(get(c, "fundCode")) ?? undefined,
      planId: normalizeId(get(c, "planId")) ?? undefined,
      workOrderNumber: normalizeId(get(c, "workOrderNumber")) ?? undefined,
      contractNumber: normalizeId(get(c, "contractNumber")) ?? undefined,
      transactionType: type,
      transactionStatus: normalizeText(get(c, "transactionStatus")) ?? undefined,
      originalAmountCents,
      normalizedAmountCents: normalizeAmount(originalAmountCents),
      extractionConfidence: Math.max(0.5, baseConf),
      rawData: c,
    });
  });

  const warnings: string[] = [];
  if (usdExcludedCount > 0) warnings.push(`${usdExcludedCount} USD row(s) excluded.`);
  if (outOfScopeCount > 0) warnings.push(`${outOfScopeCount} non Buy/Sell row(s) excluded.`);
  if (mapping.field.amount === undefined) warnings.push("No amount column could be identified.");
  return { transactions, usdExcludedCount, outOfScopeCount, warnings, amountColumnFound: mapping.field.amount !== undefined };
}
