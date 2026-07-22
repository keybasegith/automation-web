/**
 * The rules engine — section 9 of the build spec.
 *
 * Every pass/fail decision in this tool is made here, by explicit conditionals
 * and table lookups over values a human has confirmed. Nothing probabilistic
 * participates. When compliance asks "how did the system decide this account was
 * deficient?", the answer is a rule code in this file.
 *
 * Each rule is a small pure function taking confirmed data and returning
 * RuleResult(s), so each one can be unit-tested in isolation.
 */

import { DEFAULT_CONFIG, type DetectorConfig } from "./config";
import {
  INCOME_BAND_LABEL,
  canonicalizeIncomeBand,
  computeCrqRanking,
  isBlank,
  normalizeIdentifier,
  riskRankingOrdinal,
  riskToleranceOrdinal,
} from "./normalize";
import type {
  CrqData,
  NaafData,
  NaafPlan,
  ReviewData,
  RuleCode,
  RuleResult,
  RulesReport,
} from "./types";
import {
  ORDINAL_TO_CRQ_RANKING,
  RED_FLAG_RISK_TOLERANCES,
  RED_FLAG_TIME_HORIZONS,
  type NaafRiskTolerance,
  type NaafTimeHorizon,
} from "./vocab";

const ok = (code: RuleCode, title: string, message: string): RuleResult => ({
  code,
  key: code,
  status: "ok",
  title,
  message,
  remediation: "",
});

const deficiency = (
  code: RuleCode,
  title: string,
  message: string,
  remediation: string,
  extra?: { key?: string; serious?: boolean }
): RuleResult => ({
  code,
  key: extra?.key ?? code,
  status: "deficiency",
  title,
  message,
  remediation,
  serious: extra?.serious,
});

const note = (
  code: RuleCode,
  title: string,
  message: string,
  remediation = ""
): RuleResult => ({ code, key: code, status: "note", title, message, remediation });

// ---------------------------------------------------------------------------
// Plan helpers
// ---------------------------------------------------------------------------

/**
 * The risk tolerance that governs a plan.
 *
 * [CONFIRM #2] Defaults to the New column (this is a new-account review),
 * falling back to Current when New is blank. Priority is config-driven.
 */
export function effectivePlanRisk(
  plan: NaafPlan,
  config: DetectorConfig = DEFAULT_CONFIG
): NaafRiskTolerance | null {
  return config.planRiskColumnPriority === "new"
    ? plan.risk_tolerance_new ?? plan.risk_tolerance_current
    : plan.risk_tolerance_current ?? plan.risk_tolerance_new;
}

/** Time horizon that governs a plan. Follows the same column priority as risk. */
export function effectivePlanHorizon(
  plan: NaafPlan,
  config: DetectorConfig = DEFAULT_CONFIG
): NaafTimeHorizon | null {
  return config.planRiskColumnPriority === "new"
    ? plan.time_horizon_new ?? plan.time_horizon_current
    : plan.time_horizon_current ?? plan.time_horizon_new;
}

/** A plan counts as completed once both a risk tolerance and a time horizon are selected. */
export function isPlanCompleted(
  plan: NaafPlan,
  config: DetectorConfig = DEFAULT_CONFIG
): boolean {
  return (
    effectivePlanRisk(plan, config) !== null &&
    effectivePlanHorizon(plan, config) !== null
  );
}

export const completedPlans = (
  naaf: NaafData,
  config: DetectorConfig = DEFAULT_CONFIG
): NaafPlan[] => naaf.naaf_plans.filter((p) => isPlanCompleted(p, config));

// ---------------------------------------------------------------------------
// X1 — Same-client guard (blocking at intake)
// ---------------------------------------------------------------------------

export interface SameClientCheck {
  match: boolean;
  /** ID match is primary; name is only consulted when no usable ID pair exists. */
  basis: "id" | "name" | "insufficient";
  message: string;
}

export function checkSameClient(naaf: NaafData, crq: CrqData): SameClientCheck {
  const naafId = normalizeIdentifier(naaf.naaf_client_id);
  const crqId = normalizeIdentifier(crq.crq_client_id);
  const naafName = normalizeIdentifier(naaf.naaf_client_name);
  const crqName = normalizeIdentifier(crq.crq_client_name);

  if (naafId && crqId) {
    const match = naafId === crqId;
    return {
      match,
      basis: "id",
      message: match
        ? `Client ID matches on both documents (${naaf.naaf_client_id.trim()}).`
        : `Client ID differs: the NAAF shows "${naaf.naaf_client_id.trim()}" and the CRQ shows "${crq.crq_client_id.trim()}". These may belong to two different clients.`,
    };
  }

  if (naafName && crqName) {
    const match = naafName === crqName;
    return {
      match,
      basis: "name",
      message: match
        ? `Client ID is missing on at least one document, but the client name matches (${naaf.naaf_client_name.trim()}).`
        : `Client name differs: the NAAF shows "${naaf.naaf_client_name.trim()}" and the CRQ shows "${crq.crq_client_name.trim()}". These may belong to two different clients.`,
    };
  }

  return {
    match: false,
    basis: "insufficient",
    message:
      "Neither a client ID nor a client name is available on both documents, so the tool cannot confirm they belong to the same client.",
  };
}

function ruleX1(naaf: NaafData, crq: CrqData): RuleResult {
  const check = checkSameClient(naaf, crq);
  return check.match
    ? ok("X1", "Same client", check.message)
    : deficiency(
        "X1",
        "Same client",
        check.message,
        "Confirm both documents belong to the same client before this account is processed.",
        { serious: true }
      );
}

// ---------------------------------------------------------------------------
// X2 — Risk profile ceiling
// ---------------------------------------------------------------------------

/** The highest risk tolerance selected across all completed plans. */
export function maxPlanRisk(
  naaf: NaafData,
  config: DetectorConfig = DEFAULT_CONFIG
): { ordinal: number; value: NaafRiskTolerance; plan_index: number } | null {
  let best: { ordinal: number; value: NaafRiskTolerance; plan_index: number } | null = null;
  for (const plan of completedPlans(naaf, config)) {
    const value = effectivePlanRisk(plan, config);
    const ordinal = riskToleranceOrdinal(value);
    if (value === null || ordinal === null) continue;
    if (!best || ordinal > best.ordinal) {
      best = { ordinal, value, plan_index: plan.plan_index };
    }
  }
  return best;
}

function ruleX2(data: ReviewData, config: DetectorConfig): RuleResult | null {
  const max = maxPlanRisk(data.naaf, config);
  const crqOrdinal = riskRankingOrdinal(data.crq.crq_checked_risk_ranking);

  // Nothing to compare — N3 / N-series already report the underlying gap.
  if (!max || crqOrdinal === null || !data.crq.crq_checked_risk_ranking) return null;

  const crqLabel = data.crq.crq_checked_risk_ranking;

  if (max.ordinal > crqOrdinal) {
    return deficiency(
      "X2",
      "Risk profile",
      `Plan ${max.plan_index} has a risk tolerance of "${max.value}", which is higher than the client's assessed risk ranking of "${crqLabel}" on the CRQ. The account is taking more risk than the client's assessed capacity allows.`,
      `Reduce the plan's risk tolerance to "${crqLabel}" or lower, or reassess the client's CRQ if their circumstances support a higher ranking.`,
      { serious: true }
    );
  }

  if (max.ordinal < crqOrdinal) {
    return note(
      "X2",
      "Risk profile",
      `The highest risk tolerance on the NAAF is "${max.value}" (Plan ${max.plan_index}), which is below the client's assessed risk ranking of "${crqLabel}". This is within the client's capacity and is not a deficiency.`,
      "No action required. Provided for information only."
    );
  }

  return ok(
    "X2",
    "Risk profile",
    `The highest NAAF risk tolerance ("${max.value}") matches the CRQ risk ranking ("${crqLabel}").`
  );
}

// ---------------------------------------------------------------------------
// X3 — Income band match
// ---------------------------------------------------------------------------

function ruleX3(data: ReviewData): RuleResult | null {
  const naafBand = canonicalizeIncomeBand(data.naaf.naaf_income_band);
  const crqBand = canonicalizeIncomeBand(data.crq.crq_income_band);

  // A missing income band is N2's finding, not a mismatch.
  if (!naafBand || !crqBand) return null;

  if (naafBand !== crqBand) {
    return deficiency(
      "X3",
      "Income band",
      `The income band differs between the two documents: the NAAF shows "${INCOME_BAND_LABEL[naafBand]}" and the CRQ shows "${INCOME_BAND_LABEL[crqBand]}".`,
      "Confirm the client's annual income and correct whichever document is wrong so both agree."
    );
  }

  return ok(
    "X3",
    "Income band",
    `The income band agrees on both documents (${INCOME_BAND_LABEL[naafBand]}).`
  );
}

// ---------------------------------------------------------------------------
// X4 — CRQ scoring self-check
// ---------------------------------------------------------------------------

function ruleX4(data: ReviewData, config: DetectorConfig): RuleResult | null {
  const { crq_risk_capacity_total, crq_risk_tolerance_total, crq_checked_risk_ranking } =
    data.crq;

  if (
    crq_risk_capacity_total === null ||
    crq_risk_tolerance_total === null ||
    !crq_checked_risk_ranking
  ) {
    return deficiency(
      "X4",
      "CRQ scoring",
      "The CRQ Risk Profile Summary is incomplete: it needs a Risk Capacity score total, a Risk Tolerance score total, and a checked Risk Ranking.",
      "Complete the Risk Profile Summary on the CRQ."
    );
  }

  const computed = computeCrqRanking(
    crq_risk_capacity_total,
    crq_risk_tolerance_total,
    config
  );
  if (!computed) return null;

  if (computed !== crq_checked_risk_ranking) {
    return deficiency(
      "X4",
      "CRQ scoring",
      `The Risk Ranking checked on the CRQ ("${crq_checked_risk_ranking}") does not match the ranking produced by the score totals. A Risk Capacity total of ${crq_risk_capacity_total} and a Risk Tolerance total of ${crq_risk_tolerance_total} give a Risk Ranking of "${computed}".`,
      `Correct the Risk Ranking on the CRQ to "${computed}", or correct the score totals if they were entered incorrectly.`
    );
  }

  return ok(
    "X4",
    "CRQ scoring",
    `The checked Risk Ranking ("${crq_checked_risk_ranking}") matches the score totals.`
  );
}

// ---------------------------------------------------------------------------
// N1-N7 — NAAF internal completeness
// ---------------------------------------------------------------------------

/** Client IDs on this form are alphanumeric; we only reject obvious junk. */
function isPlausibleClientId(value: string): boolean {
  const v = value.trim();
  return v.length >= 3 && /[a-z0-9]/i.test(v);
}

function ruleN1(naaf: NaafData): RuleResult {
  if (isBlank(naaf.naaf_client_id)) {
    return deficiency(
      "N1",
      "Section A — Client ID",
      "Section A does not have a Client ID.",
      "Add the Client ID to Section A of the NAAF."
    );
  }
  if (!isPlausibleClientId(naaf.naaf_client_id)) {
    return deficiency(
      "N1",
      "Section A — Client ID",
      `The Client ID in Section A ("${naaf.naaf_client_id.trim()}") does not look like a valid Client ID.`,
      "Confirm and correct the Client ID in Section A of the NAAF."
    );
  }
  if (isBlank(naaf.naaf_client_name)) {
    return deficiency(
      "N1",
      "Section A — Client ID",
      "Section A does not have a client name.",
      "Add the account holder's surname and first name to Section A of the NAAF."
    );
  }
  return ok("N1", "Section A — Client ID", "Section A has a Client ID and client name.");
}

function ruleN2(naaf: NaafData): RuleResult {
  const missing: string[] = [];
  if (!naaf.naaf_income_band) missing.push("Approximate Income");
  if (isBlank(naaf.naaf_net_worth)) missing.push("Approximate Net Worth");

  if (missing.length > 0) {
    return deficiency(
      "N2",
      "Section C — KYC",
      `Section C is incomplete: ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} missing.`,
      "Complete the missing Section C fields on the NAAF."
    );
  }
  return ok("N2", "Section C — KYC", "Section C has an income band and net worth figures.");
}

function ruleN3(naaf: NaafData, config: DetectorConfig): RuleResult {
  if (completedPlans(naaf, config).length === 0) {
    return deficiency(
      "N3",
      "Investment plans",
      "No investment plan on the NAAF has both a risk tolerance and a time horizon selected.",
      "Complete the risk tolerance and time horizon for at least one investment plan."
    );
  }
  const count = completedPlans(naaf, config).length;
  return ok(
    "N3",
    "Investment plans",
    `${count} investment plan${count === 1 ? " has" : "s have"} a risk tolerance and time horizon selected.`
  );
}

function ruleN4(naaf: NaafData): RuleResult {
  const tcp = naaf.naaf_tcp;
  const missing: string[] = [];
  if (isBlank(tcp.surname)) missing.push("surname");
  if (isBlank(tcp.first_name)) missing.push("first name");
  if (isBlank(tcp.phone)) missing.push("phone number");
  if (isBlank(tcp.email)) missing.push("email address");
  if (isBlank(tcp.relationship)) missing.push("relationship to client");

  if (missing.length > 0) {
    return deficiency(
      "N4",
      "Section M — Trusted Contact",
      missing.length === 5
        ? "Section M (Trusted Contact Person) has not been completed."
        : `Section M (Trusted Contact Person) is missing: ${missing.join(", ")}.`,
      "Complete every Trusted Contact Person field in Section M of the NAAF."
    );
  }
  return ok("N4", "Section M — Trusted Contact", "Section M is complete.");
}

function ruleN5(naaf: NaafData): RuleResult {
  if (naaf.naaf_oba_not_applicable) {
    return ok(
      "N5",
      "Section P — Outside Business Activity",
      "Section P is marked Not Applicable."
    );
  }

  const missing: string[] = [];
  if (isBlank(naaf.naaf_oba_description)) missing.push("a description of the outside activity");
  if (isBlank(naaf.naaf_oba_primary_initials))
    missing.push("the primary account holder's initials");
  if (naaf.naaf_is_joint && isBlank(naaf.naaf_oba_joint_initials))
    missing.push("the joint account holder's initials");

  if (missing.length > 0) {
    return deficiency(
      "N5",
      "Section P — Outside Business Activity",
      `Section P is not marked Not Applicable, so it must be completed. Missing: ${missing.join(", ")}.`,
      "Complete Section P of the NAAF, or check Not Applicable if the advisor has no outside business activity."
    );
  }
  return ok(
    "N5",
    "Section P — Outside Business Activity",
    "Section P has a description and the required initials."
  );
}

function ruleN6(naaf: NaafData): RuleResult {
  const required = naaf.naaf_is_joint ? 2 : 1;
  const signatures = naaf.naaf_client_signatures;
  const problems: string[] = [];

  for (let i = 0; i < required; i++) {
    const holder = required === 1 ? "The account holder" : i === 0 ? "The primary account holder" : "The joint account holder";
    const sig = signatures[i];
    if (!sig || (!sig.signature_present && !sig.date_present)) {
      problems.push(`${holder} has not signed or dated Section Q`);
    } else if (!sig.signature_present) {
      problems.push(`${holder}'s signature is missing from Section Q`);
    } else if (!sig.date_present) {
      problems.push(`${holder}'s signature in Section Q is not dated`);
    }
  }

  if (problems.length > 0) {
    return deficiency(
      "N6",
      "Section Q — Client signatures",
      `${problems.join("; ")}.`,
      "Obtain the missing client signature(s) and date(s) in Section Q of the NAAF."
    );
  }
  return ok(
    "N6",
    "Section Q — Client signatures",
    naaf.naaf_is_joint
      ? "Both account holders have signed and dated Section Q."
      : "The account holder has signed and dated Section Q."
  );
}

function ruleN7(naaf: NaafData): RuleResult {
  const missing: string[] = [];
  if (isBlank(naaf.naaf_advisor_name)) missing.push("the advisor's name");
  if (!naaf.naaf_advisor_signature_present) missing.push("the advisor's signature");
  if (!naaf.naaf_advisor_date_present) missing.push("the advisor's date");

  if (missing.length > 0) {
    return deficiency(
      "N7",
      "Section R — Advisor information",
      `Section R is incomplete: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} missing.`,
      "Complete Section R of the NAAF with the advisor's name, signature, and date."
    );
  }
  return ok(
    "N7",
    "Section R — Advisor information",
    "Section R has the advisor's name, signature, and date."
  );
}

// ---------------------------------------------------------------------------
// N8 — Risk / time-horizon red flag (per plan)
// ---------------------------------------------------------------------------

function ruleN8(naaf: NaafData, config: DetectorConfig): RuleResult[] {
  const results: RuleResult[] = [];

  for (const plan of completedPlans(naaf, config)) {
    const risk = effectivePlanRisk(plan, config);
    const horizon = effectivePlanHorizon(plan, config);
    if (!risk || !horizon) continue;

    const flagged =
      RED_FLAG_RISK_TOLERANCES.includes(risk) && RED_FLAG_TIME_HORIZONS.includes(horizon);

    if (flagged) {
      results.push(
        deficiency(
          "N8",
          `Plan ${plan.plan_index} — risk vs. time horizon`,
          `Plan ${plan.plan_index}: the selected risk tolerance (${risk}) is inconsistent with the selected time horizon (${horizon}).`,
          `Please review this with the client and either adjust the risk tolerance or the time horizon, or provide a documented rationale for the combination.`,
          { key: `N8-plan-${plan.plan_index}` }
        )
      );
    }
  }

  if (results.length === 0) {
    return [
      ok(
        "N8",
        "Risk vs. time horizon",
        "No plan combines an elevated risk tolerance with a short time horizon."
      ),
    ];
  }
  return results;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/** Every rule code the engine evaluates, for the audit record. */
export const ALL_RULE_CODES: readonly RuleCode[] = [
  "X1",
  "X2",
  "X3",
  "X4",
  "N1",
  "N2",
  "N3",
  "N4",
  "N5",
  "N6",
  "N7",
  "N8",
];

/**
 * Run every rule against confirmed values.
 *
 * X2/X3/X4 return null when their inputs are absent — the N-series reports the
 * underlying gap, and a missing field should not also masquerade as a mismatch.
 */
export function runRules(
  data: ReviewData,
  config: DetectorConfig = DEFAULT_CONFIG
): RulesReport {
  const results: RuleResult[] = [];

  results.push(ruleX1(data.naaf, data.crq));

  const x2 = ruleX2(data, config);
  if (x2) results.push(x2);

  const x3 = ruleX3(data);
  if (x3) results.push(x3);

  const x4 = ruleX4(data, config);
  if (x4) results.push(x4);

  results.push(ruleN1(data.naaf));
  results.push(ruleN2(data.naaf));
  results.push(ruleN3(data.naaf, config));
  results.push(ruleN4(data.naaf));
  results.push(ruleN5(data.naaf));
  results.push(ruleN6(data.naaf));
  results.push(ruleN7(data.naaf));
  results.push(...ruleN8(data.naaf, config));

  const deficiencies = results.filter((r) => r.status === "deficiency");
  const notes = results.filter((r) => r.status === "note");
  const passed = results.filter((r) => r.status === "ok");

  // Sort the serious findings to the top of the reviewer's list and the email.
  deficiencies.sort((a, b) => Number(b.serious ?? false) - Number(a.serious ?? false));

  return {
    results,
    deficiencies,
    notes,
    passed,
    clean: deficiencies.length === 0,
  };
}

export { ORDINAL_TO_CRQ_RANKING };
