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
  compareIncomeBands,
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
  RiskAllocation,
  ReviewData,
  RuleCode,
  RuleResult,
  RulesReport,
} from "./types";
import {
  NAAF_RISK_TOLERANCES,
  OMITS_OBA,
  ORDINAL_TO_CRQ_RANKING,
  docLabel,
  sectionRef,
  sectionShort,
  sectionTitle,
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
 * Is any band of this allocation filled in? A spread of explicit zeros counts
 * as filled — that is a completed block with a mistake in it, which is a
 * different finding from a blank block.
 */
export function allocationIsBlank(alloc: RiskAllocation): boolean {
  return NAAF_RISK_TOLERANCES.every((band) => alloc[band] === null);
}

/** Sum of the filled bands. Null bands contribute nothing. */
export function allocationTotal(alloc: RiskAllocation): number {
  return NAAF_RISK_TOLERANCES.reduce((sum, band) => sum + (alloc[band] ?? 0), 0);
}

/**
 * The risk tolerance that governs a plan: the HIGHEST band carrying a non-zero
 * allocation.
 *
 * [CONFIRM #3] The printed block spreads risk across five bands (60% Medium /
 * 40% High is a normal answer), so "the client's risk tolerance" has to be
 * reduced to one band before X2 can compare it with the CRQ ranking. We take
 * the highest funded band, because X2 asks whether the account takes MORE risk
 * than the client's assessed capacity allows — and money sitting in the High
 * band does that whether it is 40% of the plan or 1% of it.
 *
 * The alternative reading — the dominant (largest) band — would let a plan put
 * a sliver above the client's ceiling without ever being flagged. Compliance
 * should confirm which they intend; only this function changes either way.
 */
export function riskFromAllocation(
  alloc: RiskAllocation
): NaafRiskTolerance | null {
  let highest: NaafRiskTolerance | null = null;
  for (const band of NAAF_RISK_TOLERANCES) {
    const pct = alloc[band];
    if (pct !== null && pct > 0) highest = band;
  }
  return highest;
}

/**
 * [CONFIRM #2] Defaults to the New column (this is a new-account review),
 * falling back to Current when New is blank. Priority is config-driven.
 *
 * NOTE ON THE FORM: the AcroForm field names invite exactly the wrong guess.
 * `{n}PRiskTolerence_*_Per` is the CURRENT column and `{n}zper_*` is the NEW
 * one — confirmed by widget x-coordinates on public/form-KYC.pdf, where the
 * printed header reads "Current | New" left to right. The mapping lives in
 * ./extract; this function only sees the resolved columns.
 */
export function effectivePlanRisk(
  plan: NaafPlan,
  config: DetectorConfig = DEFAULT_CONFIG
): NaafRiskTolerance | null {
  const preferred =
    config.planRiskColumnPriority === "new"
      ? plan.risk_allocation_new
      : plan.risk_allocation_current;
  const fallback =
    config.planRiskColumnPriority === "new"
      ? plan.risk_allocation_current
      : plan.risk_allocation_new;

  return allocationIsBlank(preferred)
    ? riskFromAllocation(fallback)
    : riskFromAllocation(preferred);
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
  const naafBand = data.naaf.naaf_income_band;
  const crqBand = data.crq.crq_income_band;
  const kind = data.naaf.naaf_doc_kind;

  // Nothing to compare — N2 already reports a missing income band.
  if (!naafBand || !crqBand) return null;

  const agreement = compareIncomeBands(naafBand, crqBand);
  if (agreement === null) return null;

  if (agreement === "same") {
    return ok(
      "X3",
      "Income band",
      `The income band agrees on both documents (${naafBand}).`
    );
  }

  // crq24's bands are wider than the NAAF's — "$75,000 - $149,999" covers two of
  // them — so a NAAF band sitting inside the CRQ band is the forms agreeing, not
  // disagreeing. [CONFIRM #4] Compliance to confirm containment counts as a
  // match; only this branch changes if they want an exact-range rule instead.
  if (agreement === "contained") {
    return ok(
      "X3",
      "Income band",
      `The ${docLabel(kind)} records ${naafBand}, which falls inside the wider band selected on the CRQ (${crqBand}). The two documents agree.`
    );
  }

  if (agreement === "overlapping") {
    return deficiency(
      "X3",
      "Income band",
      `The income bands only partly overlap: the ${docLabel(kind)} records ${naafBand} and the CRQ records ${crqBand}. Neither band contains the other, so the two answers cannot both be right.`,
      "Confirm the client's annual income and correct whichever document is wrong."
    );
  }

  return deficiency(
    "X3",
    "Income band",
    `The income band on the ${docLabel(kind)} (${naafBand}) does not match the CRQ (${crqBand}).`,
    "Confirm the client's annual income and correct whichever document is wrong."
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

  // The two revisions score on different tables, so an unknown revision means
  // the arithmetic cannot be re-derived. Say so rather than skipping silently:
  // a reviewer who sees no X4 line reasonably assumes the scoring was checked.
  if (!data.crq.crq_form_version) {
    return note(
      "X4",
      "CRQ scoring",
      "The CRQ revision could not be determined, and crq24 and v2-crq25 score on different tables, so the checked Risk Ranking was not re-derived from the score totals.",
      "Set the CRQ revision on the verification screen and re-run, or confirm the Risk Ranking against the form by eye."
    );
  }

  const computed = computeCrqRanking(
    crq_risk_capacity_total,
    crq_risk_tolerance_total,
    data.crq.crq_form_version,
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
// N1-N7 — internal completeness of the NAAF or the KYC Update
//
// Sections A and C are lettered the same on both forms; the later sections are
// not, so every message below builds its reference from SECTIONS rather than
// naming a letter inline. Citing the wrong letter sends the advisor to the
// wrong page of the form they actually hold.
// ---------------------------------------------------------------------------

/** Client IDs on this form are alphanumeric; we only reject obvious junk. */
function isPlausibleClientId(value: string): boolean {
  const v = value.trim();
  return v.length >= 3 && /[a-z0-9]/i.test(v);
}

function ruleN1(naaf: NaafData): RuleResult {
  const kind = naaf.naaf_doc_kind;
  const form = docLabel(kind);
  const ref = sectionRef(kind, "clientId");
  const short = sectionShort(kind, "clientId");
  const title = sectionTitle(kind, "clientId", "Client ID");

  if (isBlank(naaf.naaf_client_id)) {
    return deficiency(
      "N1",
      title,
      `${ref} does not have a Client ID.`,
      `Add the Client ID to ${short} of the ${form}.`
    );
  }
  if (!isPlausibleClientId(naaf.naaf_client_id)) {
    return deficiency(
      "N1",
      title,
      `The Client ID in ${ref} ("${naaf.naaf_client_id.trim()}") does not look like a valid Client ID.`,
      `Confirm and correct the Client ID in ${short} of the ${form}.`
    );
  }
  if (isBlank(naaf.naaf_client_name)) {
    return deficiency(
      "N1",
      title,
      `${ref} does not have a client name.`,
      `Add the account holder's surname and first name to ${short} of the ${form}.`
    );
  }
  return ok("N1", title, `${ref} has a Client ID and client name.`);
}

function ruleN2(naaf: NaafData): RuleResult {
  const kind = naaf.naaf_doc_kind;
  const ref = sectionRef(kind, "kyc");
  const short = sectionShort(kind, "kyc");
  const title = sectionTitle(kind, "kyc", "KYC");

  const missing: string[] = [];
  if (!naaf.naaf_income_band) missing.push("Approximate Income");
  if (isBlank(naaf.naaf_net_worth)) missing.push("Approximate Net Worth");

  if (missing.length > 0) {
    return deficiency(
      "N2",
      title,
      `${ref} is incomplete: ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} missing.`,
      `Complete the missing ${short} fields on the ${docLabel(kind)}.`
    );
  }
  return ok("N2", title, `${ref} has an income band and net worth figures.`);
}

function ruleN3(naaf: NaafData, config: DetectorConfig): RuleResult {
  const kind = naaf.naaf_doc_kind;
  const ref = sectionRef(kind, "plans");
  const short = sectionShort(kind, "plans");

  if (completedPlans(naaf, config).length === 0) {
    return deficiency(
      "N3",
      "Investment plans",
      `No investment plan in ${ref} of the ${docLabel(kind)} has both a risk tolerance allocation and a time horizon selected.`,
      "Complete the risk tolerance percentages and the time horizon for at least one investment plan."
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
  const kind = naaf.naaf_doc_kind;
  const ref = sectionRef(kind, "trustedContact");
  const short = sectionShort(kind, "trustedContact");
  const title = sectionTitle(kind, "trustedContact", "Trusted Contact");

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
      title,
      missing.length === 5
        ? `${ref} has not been completed.`
        : `${ref} is missing: ${missing.join(", ")}.`,
      `Complete the missing fields in ${short} of the ${docLabel(kind)}.`
    );
  }
  return ok("N4", title, `${ref} is complete.`);
}

/**
 * Returns null on a KYC Update: that form has no Outside Business Activities
 * section at all, so there is nothing to complete and nothing to fail. Running
 * it anyway would put a deficiency on every KYC review for a block the advisor
 * was never given.
 */
function ruleN5(naaf: NaafData): RuleResult | null {
  const kind = naaf.naaf_doc_kind;
  // Skipped only when the form is KNOWN to have no such section. An
  // unrecognised revision most likely does have one, and running the check
  // surfaces something the reviewer can dismiss, where skipping it would hide a
  // real deficiency behind a rule that never ran.
  if (kind && OMITS_OBA[kind]) return null;

  const ref = sectionRef(kind, "oba");
  const short = sectionShort(kind, "oba");
  const title = sectionTitle(kind, "oba", "Outside Business Activity");

  if (naaf.naaf_oba_not_applicable) {
    return ok("N5", title, `${ref} is marked Not Applicable.`);
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
      title,
      `${ref} is not marked Not Applicable, so it must be completed. Missing: ${missing.join(", ")}.`,
      `Complete ${short} of the ${docLabel(kind)}, or check Not Applicable if the advisor has no outside business activity.`
    );
  }
  return ok("N5", title, `${ref} has a description and the required initials.`);
}

function ruleN6(naaf: NaafData): RuleResult {
  const kind = naaf.naaf_doc_kind;
  const ref = sectionRef(kind, "clientSignatures");
  const short = sectionShort(kind, "clientSignatures");
  const title = sectionTitle(kind, "clientSignatures", "Client signatures");

  const required = naaf.naaf_is_joint ? 2 : 1;
  const signatures = naaf.naaf_client_signatures;
  const problems: string[] = [];

  for (let i = 0; i < required; i++) {
    const holder = required === 1 ? "The account holder" : i === 0 ? "The primary account holder" : "The joint account holder";
    const sig = signatures[i];
    if (!sig || (!sig.signature_present && !sig.date_present)) {
      problems.push(`${holder} has not signed or dated ${ref}`);
    } else if (!sig.signature_present) {
      problems.push(`${holder}'s signature is missing from ${ref}`);
    } else if (!sig.date_present) {
      problems.push(`${holder}'s signature in ${ref} is not dated`);
    }
  }

  if (problems.length > 0) {
    return deficiency(
      "N6",
      title,
      `${problems.join("; ")}.`,
      `Obtain the missing client signature(s) and date(s) in ${short} of the ${docLabel(kind)}.`
    );
  }
  return ok(
    "N6",
    title,
    naaf.naaf_is_joint
      ? `Both account holders have signed and dated ${ref}.`
      : `The account holder has signed and dated ${ref}.`
  );
}

function ruleN7(naaf: NaafData): RuleResult {
  const kind = naaf.naaf_doc_kind;
  const ref = sectionRef(kind, "advisor");
  const short = sectionShort(kind, "advisor");
  const title = sectionTitle(kind, "advisor", "Advisor information");

  const missing: string[] = [];
  if (isBlank(naaf.naaf_advisor_name)) missing.push("the advisor's name");
  if (!naaf.naaf_advisor_signature_present) missing.push("the advisor's signature");
  if (!naaf.naaf_advisor_date_present) missing.push("the advisor's date");

  if (missing.length > 0) {
    return deficiency(
      "N7",
      title,
      `${ref} is incomplete: ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} missing.`,
      `Complete ${short} of the ${docLabel(kind)} with the advisor's name, signature, and date.`
    );
  }
  return ok("N7", title, `${ref} has the advisor's name, signature, and date.`);
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
  const n5 = ruleN5(data.naaf);
  if (n5) results.push(n5);
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
