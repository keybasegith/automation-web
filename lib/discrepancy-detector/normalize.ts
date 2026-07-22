/**
 * Section 8 normalization tables.
 *
 * Pure and total: every function here returns a value or null, never throws, and
 * never guesses. If a string does not resolve to a known band, it returns null
 * and the caller treats the field as missing rather than inventing a match.
 */

import { DEFAULT_CONFIG, type DetectorConfig } from "./config";
import {
  CRQ_RANKING_ORDINAL,
  ORDINAL_TO_CRQ_RANKING,
  RISK_ORDINAL,
  type CrqIncomeBand,
  type CrqRiskRanking,
  type IncomeBandId,
  type NaafIncomeBand,
  type NaafRiskTolerance,
} from "./vocab";

/** Lower-case, collapse whitespace, drop separators that vary between the forms. */
export function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Comparison key for names and IDs — case, whitespace, and punctuation insensitive. */
export function normalizeIdentifier(value: unknown): string {
  return normalizeText(value).replace(/[.,'’\-_]/g, "");
}

export const isBlank = (value: unknown): boolean =>
  typeof value !== "string" || value.trim() === "";

/**
 * Table 8C — both forms' income labels collapse to one canonical id.
 *
 * Matching is done on digits alone (e.g. "25 49" -> 25k_50k) so that "Under" vs
 * "Less than", "$1 Million and Over" vs "$1,000,000 or more", and any stray
 * whitespace or punctuation all land on the same id.
 */
export function canonicalizeIncomeBand(
  value: NaafIncomeBand | CrqIncomeBand | string | null | undefined
): IncomeBandId | null {
  const v = normalizeText(value);
  if (!v) return null;

  // The open-ended top band never carries a range, so match it before digits.
  if (/1\s*million|1,000,000|1000000/.test(v)) return "1m_plus";

  // The open-ended bottom band: "Under $25,000" / "Less than $25,000".
  if (/(under|less than|below)\D*25/.test(v)) return "under_25k";

  // Strip the thousands separators BEFORE reading numbers, so "$25,000" stays a
  // single 25000 rather than splitting into 25 and 000.
  const numbers = v.replace(/,/g, "").match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;

  // Keyed on the band's lower bound, which is unambiguous across both wordings.
  const lower = numbers[0];
  const BY_LOWER_BOUND: Record<string, IncomeBandId> = {
    "25000": "25k_50k",
    "50000": "50k_75k",
    "75000": "75k_100k",
    "100000": "100k_125k",
    "125000": "125k_200k",
    "200000": "200k_1m",
  };
  return BY_LOWER_BOUND[lower] ?? null;
}

/** Human-readable label for a canonical income id, for messages and the email. */
export const INCOME_BAND_LABEL: Record<IncomeBandId, string> = {
  under_25k: "Under $25,000",
  "25k_50k": "$25,000 - $49,999",
  "50k_75k": "$50,000 - $74,999",
  "75k_100k": "$75,000 - $99,999",
  "100k_125k": "$100,000 - $124,999",
  "125k_200k": "$125,000 - $199,999",
  "200k_1m": "$200,000 - $999,999",
  "1m_plus": "$1 Million and Over",
};

/**
 * Table 8B — a CRQ score total resolves to a risk level.
 *
 * The 12 boundary is config-driven; see [CONFIRM #1] in ./config. Default:
 * Low = <= 12, Low Medium = 13-24, Medium = 25-36, Medium High = 37-48,
 * High = 49+.
 */
export function scoreToRiskLevel(
  total: number | null | undefined,
  config: DetectorConfig = DEFAULT_CONFIG
): CrqRiskRanking | null {
  if (typeof total !== "number" || !Number.isFinite(total)) return null;
  if (total <= config.lowBandUpperBound) return "Low";
  if (total <= 24) return "Low Medium";
  if (total <= 36) return "Medium";
  if (total <= 48) return "Medium High";
  return "High";
}

/**
 * The CRQ's final Risk Ranking is the LOWER of the capacity and tolerance
 * levels — the client is held to whichever of the two constrains them more.
 */
export function lowerRiskLevel(
  a: CrqRiskRanking | null,
  b: CrqRiskRanking | null
): CrqRiskRanking | null {
  if (!a || !b) return null;
  const ordinal = Math.min(CRQ_RANKING_ORDINAL[a], CRQ_RANKING_ORDINAL[b]);
  return ORDINAL_TO_CRQ_RANKING[ordinal];
}

/** Derive the CRQ Risk Ranking from its two score totals (rule X4). */
export function computeCrqRanking(
  capacityTotal: number | null,
  toleranceTotal: number | null,
  config: DetectorConfig = DEFAULT_CONFIG
): CrqRiskRanking | null {
  return lowerRiskLevel(
    scoreToRiskLevel(capacityTotal, config),
    scoreToRiskLevel(toleranceTotal, config)
  );
}

export const riskToleranceOrdinal = (v: NaafRiskTolerance | null): number | null =>
  v ? RISK_ORDINAL[v] : null;

export const riskRankingOrdinal = (v: CrqRiskRanking | null): number | null =>
  v ? CRQ_RANKING_ORDINAL[v] : null;
