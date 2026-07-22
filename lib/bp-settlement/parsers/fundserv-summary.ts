/**
 * Parser for the Fundserv "Settlement Summary by Category" (spec §"SUMMARY
 * EXTRACTION" / §"SUMMARY TOTAL VALIDATION").
 *
 * Reads the EXPECTED Buy/Sell figures directly from the file — never derived
 * from the detail file:
 *   Buy  = Net Matched - Pay Only  (Payable + Pay Tx)
 *   Sell = Net Matched - Rec Only  (Receivable + Rec Tx)
 *   Net Matched - All is captured for secondary validation only.
 *
 * Works on text extracted from a PDF or built from an Excel sheet. When a value
 * cannot be read it is reported as unavailable — no fallback, no guessing.
 */

import { parseAmountToCents } from "@/lib/net-settlement/money";
import type { FundservCategorySummary, SettlementFileType, SourceRef } from "../types";

const MONEY_RE = /\(?\s*-?\s*\$?\s*[\d,]+\.\d{2}\s*\)?-?/g;

export interface SummarySourceMeta {
  fileName: string;
  documentType: SettlementFileType;
  page?: number;
  sheet?: string;
}

function moneyTokens(slice: string): number[] {
  const out: number[] = [];
  for (const m of slice.match(MONEY_RE) ?? []) {
    const c = parseAmountToCents(m);
    if (c !== null) out.push(c);
  }
  return out;
}

/** Integer tokens that are NOT part of a money value (used for Tx counts). */
function intTokens(slice: string): number[] {
  const withoutMoney = slice.replace(MONEY_RE, " ");
  return (withoutMoney.match(/\b\d{1,5}\b/g) ?? []).map(Number);
}

function sliceForLabel(text: string, label: RegExp, stops: RegExp[]): { slice: string } | null {
  const m = label.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length;
  let end = text.length;
  for (const stop of stops) {
    stop.lastIndex = start;
    const sm = stop.exec(text);
    if (sm && sm.index < end) end = sm.index;
  }
  const nl = text.indexOf("\n", start);
  if (nl >= 0 && nl < end) end = nl;
  return { slice: text.slice(start, end) };
}

function isolateCad(text: string): { cad: string; usdSeen: boolean } {
  const lower = text.toLowerCase();
  const cadIdx = lower.indexOf("canadian dollar");
  const usdIdx = lower.search(/american dollar|us dollar|\busd\b/);
  const usdSeen = usdIdx >= 0;
  if (cadIdx < 0) return { cad: text, usdSeen };
  const end = usdIdx > cadIdx ? usdIdx : text.length;
  return { cad: text.slice(cadIdx, end), usdSeen };
}

function ref(meta: SummarySourceMeta, rowLabel: string, original: string, status: "extracted" | "unavailable"): SourceRef {
  return {
    fileName: meta.fileName,
    documentType: meta.documentType,
    page: meta.page,
    sheet: meta.sheet,
    row: rowLabel,
    originalValue: original,
    extractionStatus: status,
  };
}

export function parseCategorySummary(
  rawText: string,
  meta: SummarySourceMeta
): FundservCategorySummary {
  // Collapse column spacing to single spaces (keep line breaks) so labels split
  // across PDF text-runs still match. The hyphen-spacing regexes below tolerate
  // Fundserv's "- Pay Only" and "-All" variants.
  const text = rawText.replace(/\r/g, "").replace(/[ \t]+/g, " ");
  const warnings: string[] = [];
  const hasHeader = /settlement summary by category/i.test(text);
  if (!hasHeader) warnings.push("Header 'SETTLEMENT SUMMARY BY CATEGORY' not found.");

  const { cad, usdSeen } = isolateCad(text);
  if (usdSeen) warnings.push("USD section detected in the summary and excluded.");

  const stops = [
    /net matched\s*-\s*all/gi,
    /net matched\s*-\s*pay only/gi,
    /net matched\s*-\s*rec only/gi,
    /net contract/gi,
    /individual matched/gi,
    /individual order/gi,
    /net matched switch/gi,
    /american dollar|us dollar/gi,
  ];

  // Columns are: Payable | Receivable | Net Settlement | Pay Tx | Rec Tx | Total.
  // Buy amount = Payable (money[0]); Sell amount = Receivable (money[1]). The
  // last integer on an "…Only" row equals its Tx count (the other side is 0).

  // Buy = Net Matched - Pay Only → Payable
  const paySlice = sliceForLabel(cad, /net matched\s*-\s*pay only/i, stops);
  const payMoney = paySlice ? moneyTokens(paySlice.slice) : [];
  const payInts = paySlice ? intTokens(paySlice.slice) : [];
  const buyAmount = payMoney.length ? Math.abs(payMoney[0]) : null;
  const buyCount = payInts.length ? payInts[payInts.length - 1] : null;

  // Sell = Net Matched - Rec Only → Receivable (2nd money column, not the 1st)
  const recSlice = sliceForLabel(cad, /net matched\s*-\s*rec only/i, stops);
  const recMoney = recSlice ? moneyTokens(recSlice.slice) : [];
  const recInts = recSlice ? intTokens(recSlice.slice) : [];
  const sellAmount =
    recMoney.length >= 2 ? Math.abs(recMoney[1]) : recMoney.length === 1 ? Math.abs(recMoney[0]) : null;
  const sellCount = recInts.length ? recInts[recInts.length - 1] : null;

  // Net Matched - All (secondary)
  const allSlice = sliceForLabel(cad, /net matched\s*-\s*all/i, stops);
  const allMoney = allSlice ? moneyTokens(allSlice.slice) : [];
  const allInts = allSlice ? intTokens(allSlice.slice) : [];

  if (buyAmount === null && sellAmount === null) {
    warnings.push("Neither Net Matched - Pay Only nor Net Matched - Rec Only could be read.");
  } else {
    if (buyAmount === null) warnings.push("Net Matched - Pay Only (Buy) could not be read.");
    if (sellAmount === null) warnings.push("Net Matched - Rec Only (Sell) could not be read.");
  }

  const parsed = buyAmount !== null || sellAmount !== null;

  return {
    buy: {
      amountCents: buyAmount,
      txCount: buyCount,
      source: ref(meta, "Net Matched - Pay Only", paySlice?.slice.trim() ?? "", buyAmount !== null ? "extracted" : "unavailable"),
    },
    sell: {
      amountCents: sellAmount,
      txCount: sellCount,
      source: ref(meta, "Net Matched - Rec Only", recSlice?.slice.trim() ?? "", sellAmount !== null ? "extracted" : "unavailable"),
    },
    netMatchedAll: allSlice
      ? {
          payableCents: allMoney[0] !== undefined ? Math.abs(allMoney[0]) : null,
          receivableCents: allMoney[1] !== undefined ? Math.abs(allMoney[1]) : null,
          payTx: allInts[0] ?? null,
          recTx: allInts[1] ?? null,
          source: ref(meta, "Net Matched - All", allSlice.slice.trim(), "extracted"),
        }
      : undefined,
    parsed,
    warnings,
  };
}
