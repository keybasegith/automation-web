/**
 * Empty-state constructors.
 *
 * Both extraction paths (validated text layer, and manual entry for scans)
 * start from these and converge on the same verification screen — the pre-fill
 * is an optional convenience on the front, not a separate tool.
 */

import type { CrqData, NaafData, NaafPlan, ReviewData } from "./types";
import { MAX_PLANS } from "./vocab";

export const blankPlan = (plan_index: number): NaafPlan => ({
  plan_index,
  risk_tolerance_current: null,
  risk_tolerance_new: null,
  time_horizon_current: null,
  time_horizon_new: null,
});

export const blankNaaf = (): NaafData => ({
  naaf_form_type: null,
  naaf_client_id: "",
  naaf_client_name: "",
  naaf_is_joint: false,
  naaf_client_b_name: "",
  naaf_income_band: null,
  naaf_net_worth: "",
  naaf_plans: Array.from({ length: MAX_PLANS }, (_, i) => blankPlan(i + 1)),
  naaf_tcp: { surname: "", first_name: "", phone: "", email: "", relationship: "" },
  naaf_oba_not_applicable: false,
  naaf_oba_description: "",
  naaf_oba_primary_initials: "",
  naaf_oba_joint_initials: "",
  naaf_client_signatures: [{ signature_present: false, date_present: false }],
  naaf_advisor_name: "",
  naaf_advisor_signature_present: false,
  naaf_advisor_date_present: false,
  naaf_rep_code: "",
  naaf_dealer_code: "",
});

export const blankCrq = (): CrqData => ({
  crq_version: null,
  crq_client_id: "",
  crq_client_name: "",
  crq_income_band: null,
  crq_risk_capacity_total: null,
  crq_risk_tolerance_total: null,
  crq_checked_risk_ranking: null,
  crq_advisor_name: "",
  crq_advisor_date_present: false,
  crq_client_signature_present: false,
});

export const blankReview = (): ReviewData => ({ naaf: blankNaaf(), crq: blankCrq() });
