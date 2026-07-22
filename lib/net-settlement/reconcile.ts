/**
 * Pure, browser-local reconciliation orchestrator:
 * parsed sheets -> normalized records -> matches -> summary + detected details.
 * No network, no persistence.
 */

import type { ParsedSheet } from "./parse";
import { mapFundservSheet, mapWinfundSheet } from "./mapRecords";
import type { ResolvedMapping } from "./normalize";
import { matchRecords } from "./match";
import { summarize, type ReconciliationSummary } from "./summary";
import { DEFAULT_MATCHING_RULES } from "./types";
import type { FundservRecord, WinfundRecord, MatchResult, DetectedDetails } from "./types";

export interface ReconcileResult {
  fundserv: FundservRecord[];
  winfund: WinfundRecord[];
  matches: MatchResult[];
  summary: ReconciliationSummary;
  detected: DetectedDetails;
  fundservMapping: ResolvedMapping;
  winfundMapping: ResolvedMapping;
}

export function reconcile(
  fundservSheet: ParsedSheet,
  winfundSheet: ParsedSheet,
  opts?: { fundservMapping?: ResolvedMapping; winfundMapping?: ResolvedMapping }
): ReconcileResult {
  const fMapped = mapFundservSheet(fundservSheet, null, opts?.fundservMapping);
  const wMapped = mapWinfundSheet(winfundSheet, null, opts?.winfundMapping);

  const fundserv: FundservRecord[] = fMapped.records.map((r, i) => ({ ...r, id: `F${i + 1}` }));
  const winfund: WinfundRecord[] = wMapped.records.map((r, i) => ({ ...r, id: `W${i + 1}` }));

  const { matches } = matchRecords(fundserv, winfund, DEFAULT_MATCHING_RULES);
  const summary = summarize(fundserv, winfund, matches);
  const detected = detectDetails(fundserv, winfund);

  return {
    fundserv,
    winfund,
    matches,
    summary,
    detected,
    fundservMapping: fMapped.mapping,
    winfundMapping: wMapped.mapping,
  };
}

function mode(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

export function detectDetails(fundserv: FundservRecord[], winfund: WinfundRecord[]): DetectedDetails {
  return {
    settlementDate:
      mode(fundserv.map((f) => f.settlementDate)) ??
      mode(winfund.map((w) => w.trustSettledDate)),
    dealer: mode(fundserv.map((f) => f.dealerCode)) ?? mode(winfund.map((w) => w.dealerCode)),
    currency: mode(fundserv.map((f) => f.currency)) ?? mode(winfund.map((w) => w.currency)),
    cycle: mode(fundserv.map((f) => f.cycle)),
    category: mode(fundserv.map((f) => f.category)),
  };
}

/** Which required fields are missing from a mapping (drives the mapping modal). */
export function missingFundservFields(mapping: ResolvedMapping): string[] {
  const required = ["settlementAmount", "fundId", "dealerAccountId"];
  return required.filter((f) => mapping.field[f] === undefined);
}
export function missingWinfundFields(mapping: ResolvedMapping): string[] {
  const required = ["amount", "fundNumber", "planId"];
  return required.filter((f) => mapping.field[f] === undefined);
}
