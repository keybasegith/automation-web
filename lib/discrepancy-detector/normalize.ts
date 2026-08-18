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
  CRQ_SCORE_TABLES,
  ORDINAL_TO_CRQ_RANKING,
  RISK_ORDINAL,
  type CrqFormVersion,
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
 * Numeric range a printed income band covers, in dollars. `max` is Infinity for
 * an open-ended top band.
 *
 * Parsed from the label rather than looked up, because the two CRQ revisions and
 * the NAAF word the same money three different ways ("Under $25,000" / "Less
 * than $25,000", "$1 Million and Over" / "$1,000,000 or more") and crq24 adds
 * bands that exist on no other form. A range is the one representation all of
 * them share.
 */
export function incomeBandRange(
  value: string | null | undefined
): { min: number; max: number } | null {
  const v = normalizeText(value);
  if (!v) return null;

  const millions = /(\d+)\s*million/.exec(v);
  const readAmounts = (): number[] => {
    if (millions) return [Number.parseInt(millions[1], 10) * 1_000_000];
    const digits = v.replace(/,/g, "").match(/\d+/g);
    return digits ? digits.map((d) => Number.parseInt(d, 10)) : [];
  };
  const amounts = readAmounts();
  if (amounts.length === 0) return null;

  // Open-ended bottom: "Under $25,000" / "Less than $25,000".
  if (/(under|less than|below)/.test(v)) return { min: 0, max: amounts[0] - 1 };
  // Open-ended top: "$250,000 or more" / "$1 Million and Over" / "$1,000,000 or more".
  if (/(or more|and over|and above|\+)/.test(v)) {
    return { min: amounts[0], max: Number.POSITIVE_INFINITY };
  }
  if (amounts.length >= 2) return { min: amounts[0], max: amounts[1] };
  return null;
}

/** How two income bands from different forms relate. */
export type IncomeAgreement = "same" | "contained" | "overlapping" | "disjoint";

/**
 * Compare the band on the NAAF/KYC against the band on the CRQ.
 *
 * `same`       identical ranges — the ordinary case when both forms use the
 *              eight-band scale.
 * `contained`  the NAAF band sits wholly inside the wider CRQ band. crq24's
 *              "$75,000 - $149,999" covers two NAAF bands, so this is normal on
 *              that revision and is not a discrepancy.
 * `overlapping` the bands share some income but neither contains the other —
 *              the answers are not reconcilable without asking someone.
 * `disjoint`   no shared income at all.
 */
export function compareIncomeBands(
  naafBand: string | null | undefined,
  crqBand: string | null | undefined
): IncomeAgreement | null {
  const a = incomeBandRange(naafBand);
  const b = incomeBandRange(crqBand);
  if (!a || !b) return null;
  if (a.min === b.min && a.max === b.max) return "same";
  if (a.min >= b.min && a.max <= b.max) return "contained";
  if (a.min > b.max || b.min > a.max) return "disjoint";
  return "overlapping";
}

/**
 * Table 8B — a CRQ score total resolves to a risk level, using the printed table
 * for that revision.
 *
 * `kind` matters: on crq24 the Risk Capacity and Risk Tolerance columns run on
 * different scales, so a tolerance total of 46 is Medium High while a capacity
 * total of 46 is only Low Medium. Feeding one column through the other's table
 * is a silent, plausible-looking error.
 *
 * The 12 boundary is config-driven and applies to v2-crq25 alone; see
 * [CONFIRM #1] in ./config.
 */
export function scoreToRiskLevel(
  total: number | null | undefined,
  kind: "capacity" | "tolerance",
  version: CrqFormVersion,
  config: DetectorConfig = DEFAULT_CONFIG
): CrqRiskRanking | null {
  if (typeof total !== "number" || !Number.isFinite(total)) return null;
  const printed = CRQ_SCORE_TABLES[version][kind];
  const bounds =
    version === "v2-crq25"
      ? ([config.lowBandUpperBound, printed[1], printed[2], printed[3]] as const)
      : printed;

  if (total <= bounds[0]) return "Low";
  if (total <= bounds[1]) return "Low Medium";
  if (total <= bounds[2]) return "Medium";
  if (total <= bounds[3]) return "Medium High";
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

/**
 * Derive the CRQ Risk Ranking from its two score totals (rule X4).
 *
 * Returns null when the revision is unknown: the two tables disagree, so a
 * ranking computed from a guessed one would be worse than no ranking at all.
 */
export function computeCrqRanking(
  capacityTotal: number | null,
  toleranceTotal: number | null,
  version: CrqFormVersion | null,
  config: DetectorConfig = DEFAULT_CONFIG
): CrqRiskRanking | null {
  if (!version) return null;
  return lowerRiskLevel(
    scoreToRiskLevel(capacityTotal, "capacity", version, config),
    scoreToRiskLevel(toleranceTotal, "tolerance", version, config)
  );
}

export const riskToleranceOrdinal = (v: NaafRiskTolerance | null): number | null =>
  v ? RISK_ORDINAL[v] : null;

export const riskRankingOrdinal = (v: CrqRiskRanking | null): number | null =>
  v ? CRQ_RANKING_ORDINAL[v] : null;
