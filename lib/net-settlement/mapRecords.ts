/**
 * Turn a parsed sheet into normalized Fundserv / Winfund records.
 * Raw cell values are always preserved in `raw`; normalized values are derived.
 */

import type { FundservRecord, WinfundRecord } from "./types";
import type { ParsedSheet } from "./parse";
import {
  FUNDSERV_ALIASES,
  WINFUND_ALIASES,
  resolveHeaders,
  normalizeDate,
  normalizeText,
  normalizeId,
  normalizeCode,
  normalizeTxnType,
  parseAmountToCents,
} from "./normalize";
import type { ResolvedMapping } from "./normalize";

export type DraftFundservRecord = Omit<FundservRecord, "id">;
export type DraftWinfundRecord = Omit<WinfundRecord, "id">;

export interface MappedFundserv {
  records: DraftFundservRecord[];
  mapping: ResolvedMapping;
}
export interface MappedWinfund {
  records: DraftWinfundRecord[];
  mapping: ResolvedMapping;
}

function valueFor(
  sheet: ParsedSheet,
  mapping: ResolvedMapping,
  cells: Record<string, unknown>,
  field: string
): unknown {
  const idx = mapping.field[field];
  if (idx === undefined) return null;
  return cells[sheet.headers[idx]] ?? null;
}

export function mapFundservSheet(
  sheet: ParsedSheet,
  sourceFileId: string | null,
  override?: ResolvedMapping
): MappedFundserv {
  const mapping = override ?? resolveHeaders(sheet.headers, FUNDSERV_ALIASES);
  const records = sheet.rows.map<DraftFundservRecord>((row) => {
    const v = (f: string) => valueFor(sheet, mapping, row.cells, f);
    return {
      sourceFileId,
      sourceRowNumber: row.rowNumber,
      dealerCode: normalizeId(v("dealerCode")),
      settlementDate: normalizeDate(v("settlementDate")),
      currency: normalizeText(v("currency"))?.toUpperCase() ?? null,
      cycle: normalizeText(v("cycle")),
      category: normalizeText(v("category")),
      reportType: normalizeText(v("reportType")),
      activityType: normalizeText(v("activityType")),
      code: normalizeId(v("code")),
      source: normalizeText(v("source")),
      tradeDate: normalizeDate(v("tradeDate")),
      fundId: normalizeCode(v("fundId")),
      dealerAccountId: normalizeId(v("dealerAccountId")),
      orderId: normalizeId(v("orderId")),
      sourceIdentifier: normalizeId(v("sourceIdentifier")),
      transactionType: normalizeTxnType(v("transactionType")),
      settlementAmountCents: parseAmountToCents(v("settlementAmount")),
      participant: normalizeText(v("participant")),
      contractNumber: normalizeId(v("contractNumber")),
      rawReference:
        normalizeId(v("orderId")) ?? normalizeId(v("sourceIdentifier")) ?? null,
      raw: row.cells,
    };
  });
  return { records, mapping };
}

export function mapWinfundSheet(
  sheet: ParsedSheet,
  sourceFileId: string | null,
  override?: ResolvedMapping
): MappedWinfund {
  const mapping = override ?? resolveHeaders(sheet.headers, WINFUND_ALIASES);
  const records = sheet.rows.map<DraftWinfundRecord>((row) => {
    const v = (f: string) => valueFor(sheet, mapping, row.cells, f);
    return {
      sourceFileId,
      sourceRowNumber: row.rowNumber,
      trustSettledDate: normalizeDate(v("trustSettledDate")),
      clientName: normalizeText(v("clientName")),
      settledUserId: normalizeId(v("settledUserId")),
      wireOrderNumber: normalizeId(v("wireOrderNumber")),
      supplier: normalizeId(v("supplier")),
      fundNumber: normalizeCode(v("fundNumber")),
      planId: normalizeId(v("planId")),
      planType: normalizeText(v("planType")),
      trustTransactionDate: normalizeDate(v("trustTransactionDate")),
      transactionType: normalizeTxnType(v("transactionType")),
      repCode: normalizeId(v("repCode")),
      amountCents: parseAmountToCents(v("amount")),
      transactionStatus: normalizeText(v("transactionStatus")),
      settlementStatus: normalizeText(v("settlementStatus")),
      userId: normalizeId(v("userId")),
      bankCode: normalizeId(v("bankCode")),
      dealerCode: normalizeId(v("dealerCode")),
      currency: normalizeText(v("currency"))?.toUpperCase() ?? null,
      sourceReference:
        normalizeId(v("wireOrderNumber")) ?? normalizeId(v("sourceReference" as never)) ?? null,
      raw: row.cells,
    };
  });
  return { records, mapping };
}
