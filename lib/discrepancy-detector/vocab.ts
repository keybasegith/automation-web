/**
 * The controlled vocabularies printed on NAAF (V3-NAAFE-2022) and CRQ (v2-crq25).
 *
 * These strings are the exact labels on the forms. The verification screen binds
 * dropdowns to them so the rules engine only ever sees valid values, and the
 * rules engine compares them via the shared ordinals in `RISK_ORDINAL` /
 * `CRQ_RANKING_ORDINAL` rather than by string.
 */

/**
 * NAAF / KYC Section C — Approximate Income.
 *
 * Order is the printed order, which is also the export order of the `nIncome`
 * button field ("0".."7"), so the index IS the answer.
 */
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

// ---------------------------------------------------------------------------
// CRQ form versions
//
// Two revisions are in circulation and they are NOT interchangeable: the income
// question offers different bands, and the score-to-risk-level tables differ —
// on crq24 the Risk Capacity and Risk Tolerance scales are not even the same as
// each other. Reading one version with the other's tables yields a confidently
// wrong income band and a wrong computed ranking, so every version-dependent
// table below is keyed by version and the version is detected per document.
// ---------------------------------------------------------------------------

export const CRQ_FORM_VERSIONS = ["crq24", "v2-crq25"] as const;
export type CrqFormVersion = (typeof CRQ_FORM_VERSIONS)[number];

export const CRQ_FORM_VERSION_LABEL: Record<CrqFormVersion, string> = {
  crq24: "crq24",
  "v2-crq25": "v2-crq25",
};

/** v2-crq25 Q3 — annual income from all sources. Eight bands, matching the NAAF. */
export const CRQ25_INCOME_BANDS = [
  "Less than $25,000",
  "$25,000 - $49,999",
  "$50,000 - $74,999",
  "$75,000 - $99,999",
  "$100,000 - $124,999",
  "$125,000 - $199,999",
  "$200,000 - $999,999",
  "$1,000,000 or more",
] as const;

/**
 * crq24 Q5 — annual income from all sources. Six wider bands that do NOT line up
 * with the NAAF's eight: "$75,000 - $149,999" spans two NAAF bands on its own.
 */
export const CRQ24_INCOME_BANDS = [
  "Less than $25,000",
  "$25,000 - $49,999",
  "$50,000 - $74,999",
  "$75,000 - $149,999",
  "$150,000 - $249,999",
  "$250,000 or more",
] as const;

export const CRQ_INCOME_BANDS_BY_VERSION: Record<
  CrqFormVersion,
  readonly string[]
> = {
  crq24: CRQ24_INCOME_BANDS,
  "v2-crq25": CRQ25_INCOME_BANDS,
};

/** Every band either revision can produce. */
export const CRQ_INCOME_BANDS = [
  ...CRQ25_INCOME_BANDS,
  ...CRQ24_INCOME_BANDS,
] as const;
export type CrqIncomeBand =
  | (typeof CRQ25_INCOME_BANDS)[number]
  | (typeof CRQ24_INCOME_BANDS)[number];

/**
 * Upper bound (inclusive) of the first four risk levels; the fifth is
 * open-ended. Read straight off each form's printed Risk Profile Summary.
 *
 *   crq24     Capacity   < 40 | 40 - 50 | 51 - 60 | 61 - 70 | > 70
 *             Tolerance  < 20 | 20 - 30 | 31 - 40 | 41 - 50 | > 50
 *   v2-crq25  both       < 12 | 13 - 24 | 25 - 36 | 37 - 48 | 49 +
 *
 * Only v2-crq25 has an undefined value at its first boundary (12 falls between
 * "< 12" and "13 - 24"), which is why `lowBandUpperBound` in ./config exists and
 * why it applies to that revision alone.
 */
export interface CrqScoreTable {
  capacity: readonly [number, number, number, number];
  tolerance: readonly [number, number, number, number];
}

export const CRQ_SCORE_TABLES: Record<CrqFormVersion, CrqScoreTable> = {
  crq24: {
    capacity: [39, 50, 60, 70],
    tolerance: [19, 30, 40, 50],
  },
  "v2-crq25": {
    capacity: [12, 24, 36, 48],
    tolerance: [12, 24, 36, 48],
  },
};

/**
 * Canonical income identity for the eight-band scale shared by the NAAF, the
 * KYC and v2-crq25. crq24's six bands do not map onto these — see
 * `incomeBandRange` in ./normalize, which compares bands as numeric ranges so
 * that a wider band can still be checked against a narrower one.
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

/**
 * Plan block — Time Horizon (Current / New columns). NAAF and KYC only: the v2
 * CRQ has no time-horizon question.
 *
 * Order is the printed order on the form, which is also the export order of the
 * `{n}PLiquidity` button field ("0".."5"), so the index IS the answer.
 */
export const NAAF_TIME_HORIZONS = [
  "Less than 1 Year",
  "1 - 3 Years",
  "3 - 5 Years",
  "5 - 10 Years",
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

/**
 * Both forms carry exactly three plan blocks — NAAF sections D/E/F, KYC section
 * D — and the AcroForm field names stop at the `3P`/`_c` suffix.
 */
export const MAX_PLANS = 3;

// ---------------------------------------------------------------------------
// Document kinds
// ---------------------------------------------------------------------------

/**
 * Which form the client-side half of the review was uploaded from. The CRQ is
 * fixed; its counterpart is either a new-account NAAF or a Know Your Client
 * Update, and a reviewer may hand us either.
 *
 * The two forms share 255 of their 275 AcroForm field names, so extraction is
 * one code path. What differs is the printed section lettering and the fact
 * that the KYC Update has no Outside Business Activities section at all.
 */
export const DOC_KINDS = ["NAAF", "KYC"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const DOC_KIND_LABEL: Record<DocKind, string> = {
  NAAF: "NAAF",
  KYC: "KYC Update",
};

/**
 * Section letters as printed, per form. These reach the advisor verbatim in the
 * deficiency email, so they are data rather than hardcoded strings: citing
 * "Section P" on a form whose OBA block is lettered L sends the advisor to the
 * wrong page.
 *
 * Verified against the text layer of public/form-NAAF.pdf (V3-NAAF-2022) and
 * public/form-KYC.pdf (Know Your Client Update).
 *
 * `oba: null` on the KYC is not an oversight — that form has no Outside
 * Business Activities section, so the rule is skipped rather than failed.
 */
export interface SectionLetters {
  clientId: string;
  kyc: string;
  plans: string;
  trustedContact: string;
  oba: string | null;
  clientSignatures: string;
  advisor: string;
}

export const SECTIONS: Record<DocKind, SectionLetters> = {
  NAAF: {
    clientId: "A",
    kyc: "C",
    plans: "D/E/F",
    trustedContact: "I",
    oba: "L",
    clientSignatures: "M",
    advisor: "N",
  },
  KYC: {
    clientId: "A",
    kyc: "C",
    plans: "D",
    trustedContact: "E",
    oba: null,
    clientSignatures: "F",
    advisor: "G",
  },
};

/**
 * Names of the printed sections, for the rule titles. Kept beside the letters
 * so a title and its letter can never drift apart.
 */
export const SECTION_NAMES = {
  clientId: "Account Holder Information",
  kyc: "Client KYC",
  plans: "Investment plans",
  trustedContact: "Trusted Contact Person",
  oba: "Financial Advisor Outside Business Activities",
  clientSignatures: "Client signatures",
  advisor: "Dealer/Financial Advisor Information",
} as const;

/** "Section I (Trusted Contact Person)" for whichever form is in hand. */
export const sectionRef = (
  kind: DocKind,
  key: keyof SectionLetters
): string => {
  const letter = SECTIONS[kind][key];
  const name = SECTION_NAMES[key];
  return letter ? `Section ${letter} (${name})` : name;
};
