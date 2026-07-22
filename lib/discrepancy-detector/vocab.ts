/**
 * The controlled vocabularies printed on NAAF (V3-NAAFE-2022) and CRQ (v2-crq25).
 *
 * These strings are the exact labels on the forms. The verification screen binds
 * dropdowns to them so the rules engine only ever sees valid values, and the
 * rules engine compares them via the shared ordinals in `RISK_ORDINAL` /
 * `CRQ_RANKING_ORDINAL` rather than by string.
 */

/** NAAF Section C — Approximate Income. */
export const NAAF_INCOME_BANDS = [
  "Under $25,000",
  "$25,000 - $49,999",
  "$50,000 - $74,999",
  "$75,000 - $99,999",
  "$100,000 - $124,999",
  "$125,000 - $199,999",
  "$200,000 - $999,999",
  "$1 Million and Over",
] as const;
export type NaafIncomeBand = (typeof NAAF_INCOME_BANDS)[number];

/** CRQ Q3 — Annual income from all sources. Same 8 bands, different wording. */
export const CRQ_INCOME_BANDS = [
  "Less than $25,000",
  "$25,000 - $49,999",
  "$50,000 - $74,999",
  "$75,000 - $99,999",
  "$100,000 - $124,999",
  "$125,000 - $199,999",
  "$200,000 - $999,999",
  "$1,000,000 or more",
] as const;
export type CrqIncomeBand = (typeof CRQ_INCOME_BANDS)[number];

/**
 * Canonical income identity. NAAF and CRQ band labels differ only at the two
 * ends ("Under" vs "Less than", "$1 Million and Over" vs "$1,000,000 or more"),
 * so both sides normalize to these ids before X3 compares them.
 */
export const INCOME_BAND_IDS = [
  "under_25k",
  "25k_50k",
  "50k_75k",
  "75k_100k",
  "100k_125k",
  "125k_200k",
  "200k_1m",
  "1m_plus",
] as const;
export type IncomeBandId = (typeof INCOME_BAND_IDS)[number];

/** NAAF plan block — Risk Tolerance (Current / New columns). */
export const NAAF_RISK_TOLERANCES = [
  "Low",
  "Low to Medium",
  "Medium",
  "Medium to High",
  "High",
] as const;
export type NaafRiskTolerance = (typeof NAAF_RISK_TOLERANCES)[number];

/** CRQ Risk Profile Summary — final Risk Ranking. */
export const CRQ_RISK_RANKINGS = [
  "Low",
  "Low Medium",
  "Medium",
  "Medium High",
  "High",
] as const;
export type CrqRiskRanking = (typeof CRQ_RISK_RANKINGS)[number];

/** NAAF plan block — Time Horizon (Current / New columns). NAAF only: the v2 CRQ has no time-horizon question. */
export const NAAF_TIME_HORIZONS = [
  "Less than 1 Year",
  "1 - 3 Years",
  "3 - 5 Years",
  "5 - 9 Years",
  "10 - 20 Years",
  "Over 20 Years",
] as const;
export type NaafTimeHorizon = (typeof NAAF_TIME_HORIZONS)[number];

export const NAAF_FORM_TYPES = ["New Client", "KYC Update", "Existing Client"] as const;
export type NaafFormType = (typeof NAAF_FORM_TYPES)[number];

export const CRQ_VERSIONS = ["Individual", "Joint", "Corporate"] as const;
export type CrqVersion = (typeof CRQ_VERSIONS)[number];

/**
 * Table 8A — the shared ordinal that makes a NAAF Risk Tolerance and a CRQ Risk
 * Ranking comparable. Same ordinal on both sides means the same risk level.
 */
export const RISK_ORDINAL: Record<NaafRiskTolerance, number> = {
  Low: 1,
  "Low to Medium": 2,
  Medium: 3,
  "Medium to High": 4,
  High: 5,
};

export const CRQ_RANKING_ORDINAL: Record<CrqRiskRanking, number> = {
  Low: 1,
  "Low Medium": 2,
  Medium: 3,
  "Medium High": 4,
  High: 5,
};

/** Inverse of CRQ_RANKING_ORDINAL — used to render a computed ranking back to its label. */
export const ORDINAL_TO_CRQ_RANKING: Record<number, CrqRiskRanking> = {
  1: "Low",
  2: "Low Medium",
  3: "Medium",
  4: "Medium High",
  5: "High",
};

/** N8 — the combinations treated as a red flag: elevated risk against a short horizon. */
export const RED_FLAG_RISK_TOLERANCES: readonly NaafRiskTolerance[] = [
  "Medium to High",
  "High",
];
export const RED_FLAG_TIME_HORIZONS: readonly NaafTimeHorizon[] = [
  "Less than 1 Year",
  "1 - 3 Years",
];

/** The NAAF supports up to six investment plan blocks. */
export const MAX_PLANS = 6;
