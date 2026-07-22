import { canonicalHeader } from "./normalize";
import type { SourceType } from "./types";

/** Strong header indicators for each source (canonical form). */
const FUNDSERV_INDICATORS = [
  "order id",
  "dealer account id",
  "source identifier",
  "settlement amt",
  "fund id",
  "trade date",
  "tx type",
  "n$m activity",
  "nsm activity",
];

const WINFUND_INDICATORS = [
  "trust settled date",
  "client s name",
  "clients name",
  "settled userid",
  "wire order #",
  "supplier",
  "plan id",
  "plan type",
  "trust transaction date",
  "transaction status",
  "settlement status",
  "bank code",
  "rep code",
];

export interface SourceDetection {
  source: SourceType | "unknown";
  confidence: "high" | "medium" | "low";
  fundservScore: number;
  winfundScore: number;
  matched: string[];
}

/**
 * Detect whether a parsed table is Fundserv or Winfund from its headers and
 * filename. Returns "unknown" when neither side has enough signal, so the UI
 * can prompt the user to classify it manually.
 */
export function detectSource(
  headers: string[],
  filename?: string
): SourceDetection {
  const canon = headers.map(canonicalHeader);
  const has = (needle: string) => canon.some((h) => h.includes(needle));

  const fMatched = FUNDSERV_INDICATORS.filter(has);
  const wMatched = WINFUND_INDICATORS.filter(has);
  let fScore = fMatched.length;
  let wScore = wMatched.length;

  const name = canonicalHeader(filename ?? "");
  if (/\b(fundserv|n\$m|nsm)\b/.test(name)) fScore += 2;
  if (/\b(winfund|trust)\b/.test(name)) wScore += 2;

  const matched = [...fMatched.map((m) => `fundserv:${m}`), ...wMatched.map((m) => `winfund:${m}`)];

  if (fScore === 0 && wScore === 0) {
    return { source: "unknown", confidence: "low", fundservScore: 0, winfundScore: 0, matched };
  }

  const source: SourceType = fScore >= wScore ? "fundserv" : "winfund";
  const top = Math.max(fScore, wScore);
  const margin = Math.abs(fScore - wScore);
  const confidence: "high" | "medium" | "low" =
    top >= 3 && margin >= 2 ? "high" : top >= 2 ? "medium" : "low";

  return { source, confidence, fundservScore: fScore, winfundScore: wScore, matched };
}
