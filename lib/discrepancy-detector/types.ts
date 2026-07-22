/**
 * Data schema for one NAAF + CRQ review. Mirrors section 7 of the build spec.
 *
 * Every enumerated field is typed to the exact form vocabulary in ./vocab, and
 * every field is nullable: extraction is allowed to find nothing, and the
 * reviewer fills the gap on the verification screen. Rules only ever run on
 * values a human has confirmed.
 */

import type {
  CrqIncomeBand,
  CrqRiskRanking,
  CrqVersion,
  NaafFormType,
  NaafIncomeBand,
  NaafRiskTolerance,
  NaafTimeHorizon,
} from "./vocab";

/**
 * Where a value came from. Drives the highlighting on the verification screen
 * and leaves room for a future local pre-fill source (e.g. on-premise
 * handwriting recognition) to slot in without reworking the screen.
 */
export type FieldSource = "parsed" | "manual";

export interface NaafPlan {
  plan_index: number;
  risk_tolerance_current: NaafRiskTolerance | null;
  risk_tolerance_new: NaafRiskTolerance | null;
  time_horizon_current: NaafTimeHorizon | null;
  time_horizon_new: NaafTimeHorizon | null;
}

export interface TrustedContactPerson {
  surname: string;
  first_name: string;
  phone: string;
  email: string;
  relationship: string;
}

export interface ClientSignature {
  signature_present: boolean;
  date_present: boolean;
}

export interface NaafData {
  naaf_form_type: NaafFormType | null;
  naaf_client_id: string;
  naaf_client_name: string;
  naaf_is_joint: boolean;
  naaf_client_b_name: string;
  naaf_income_band: NaafIncomeBand | null;
  /** Section C net worth. Captured now; the CRQ cross-check is deferred (spec 13). */
  naaf_net_worth: string;
  naaf_plans: NaafPlan[];
  naaf_tcp: TrustedContactPerson;
  naaf_oba_not_applicable: boolean;
  naaf_oba_description: string;
  naaf_oba_primary_initials: string;
  naaf_oba_joint_initials: string;
  naaf_client_signatures: ClientSignature[];
  naaf_advisor_name: string;
  naaf_advisor_signature_present: boolean;
  naaf_advisor_date_present: boolean;
  naaf_rep_code: string;
  naaf_dealer_code: string;
}

export interface CrqData {
  crq_version: CrqVersion | null;
  crq_client_id: string;
  crq_client_name: string;
  crq_income_band: CrqIncomeBand | null;
  crq_risk_capacity_total: number | null;
  crq_risk_tolerance_total: number | null;
  crq_checked_risk_ranking: CrqRiskRanking | null;
  crq_advisor_name: string;
  crq_advisor_date_present: boolean;
  crq_client_signature_present: boolean;
}

export interface ReviewData {
  naaf: NaafData;
  crq: CrqData;
}

/** Per-field provenance, keyed by the field names above. */
export type SourceMap = Record<string, FieldSource>;

// ---------------------------------------------------------------------------
// Rules engine
// ---------------------------------------------------------------------------

export type RuleStatus = "ok" | "deficiency" | "note";

export type RuleCode =
  | "X1"
  | "X2"
  | "X3"
  | "X4"
  | "N1"
  | "N2"
  | "N3"
  | "N4"
  | "N5"
  | "N6"
  | "N7"
  | "N8";

export interface RuleResult {
  code: RuleCode;
  /** Distinguishes repeats of a per-plan rule (N8) in the UI and the email. */
  key: string;
  status: RuleStatus;
  /** Short label for the rule itself, e.g. "Risk profile". */
  title: string;
  /** Plain-English statement of what was found. Shown to the reviewer. */
  message: string;
  /** What the advisor must do. Empty for `ok` results. */
  remediation: string;
  /** X2 over-risk is the one finding compliance treats as serious. */
  serious?: boolean;
}

export interface RulesReport {
  results: RuleResult[];
  deficiencies: RuleResult[];
  notes: RuleResult[];
  passed: RuleResult[];
  clean: boolean;
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export type ExtractionMode =
  /** A validated text layer pre-filled some fields. */
  | "parsed"
  /** No text layer, or the text layer decoded to garbage — fields start blank. */
  | "manual";

export interface ExtractionResult<T> {
  mode: ExtractionMode;
  data: T;
  sources: SourceMap;
  /** Reviewer-facing explanation of why a document fell back to manual entry. */
  warnings: string[];
  pageCount: number;
}

export interface Advisor {
  rep_code: string;
  advisor_name: string;
  email: string;
}

export interface AdvisorMatch {
  advisor: Advisor | null;
  /** How the advisor was resolved — shown to the reviewer before drafting. */
  basis: "rep_code" | "name" | "none";
  /** False whenever the reviewer must pick from the full list instead. */
  confident: boolean;
  reason: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export interface AuditEntry {
  timestamp: string;
  client_id: string;
  naaf_file: string;
  crq_file: string;
  rules_evaluated: RuleCode[];
  results: Array<{ code: RuleCode; key: string; status: RuleStatus }>;
  advisor_name: string | null;
  advisor_email: string | null;
  draft_generated: boolean;
  same_client_override: boolean;
}
