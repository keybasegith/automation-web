import { describe, expect, it } from "vitest";
import { blankCrq, blankNaaf } from "../blank";
import { DEFAULT_CONFIG } from "../config";
import { checkSameClient, maxPlanRisk, runRules } from "../rules";
import type { CrqData, NaafData, ReviewData, RuleCode } from "../types";
import { setPlanRisk } from "./helpers";

/** A NAAF that passes every N-rule; each test breaks exactly one thing. */
function cleanNaaf(): NaafData {
  const naaf = blankNaaf();
  naaf.naaf_doc_kind = "NAAF";
  naaf.naaf_form_type = "New Client";
  naaf.naaf_client_id = "C-10045";
  naaf.naaf_client_name = "Tremblay, Marie";
  naaf.naaf_income_band = "$75,000 - $99,999";
  naaf.naaf_net_worth = "250000";
  setPlanRisk(naaf.naaf_plans[0], "new", "Medium");
  naaf.naaf_plans[0].time_horizon_new = "10 - 20 Years";
  naaf.naaf_tcp = {
    surname: "Tremblay",
    first_name: "Luc",
    phone: "416-555-0134",
    email: "luc@example.com",
    relationship: "Brother",
  };
  naaf.naaf_oba_not_applicable = true;
  naaf.naaf_client_signatures = [{ signature_present: true, date_present: true }];
  naaf.naaf_advisor_name = "Jane Doe";
  naaf.naaf_advisor_signature_present = true;
  naaf.naaf_advisor_date_present = true;
  naaf.naaf_rep_code = "1234";
  naaf.naaf_dealer_code = "KB";
  return naaf;
}

/** A CRQ consistent with cleanNaaf(): Medium ranking, matching income. */
function cleanCrq(): CrqData {
  const crq = blankCrq();
  crq.crq_form_version = "v2-crq25";
  crq.crq_version = "Individual";
  crq.crq_client_id = "C-10045";
  crq.crq_client_name = "Tremblay, Marie";
  crq.crq_income_band = "$75,000 - $99,999";
  crq.crq_risk_capacity_total = 30; // -> Medium
  crq.crq_risk_tolerance_total = 30; // -> Medium
  crq.crq_checked_risk_ranking = "Medium";
  crq.crq_advisor_name = "Jane Doe";
  crq.crq_advisor_date_present = true;
  crq.crq_client_signature_present = true;
  return crq;
}

const clean = (): ReviewData => ({ naaf: cleanNaaf(), crq: cleanCrq() });

const codes = (r: { code: RuleCode }[]): RuleCode[] => r.map((x) => x.code);

describe("the clean baseline", () => {
  it("reports no deficiencies", () => {
    const report = runRules(clean());
    expect(report.deficiencies).toEqual([]);
    expect(report.clean).toBe(true);
  });
});

describe("X1 - same-client guard", () => {
  it("matches on client ID regardless of case and whitespace", () => {
    const naaf = cleanNaaf();
    const crq = cleanCrq();
    naaf.naaf_client_id = " c-10045 ";
    expect(checkSameClient(naaf, crq)).toMatchObject({ match: true, basis: "id" });
  });

  it("flags a client ID mismatch", () => {
    const data = clean();
    data.crq.crq_client_id = "C-99999";
    const check = checkSameClient(data.naaf, data.crq);
    expect(check.match).toBe(false);
    expect(check.basis).toBe("id");
    expect(codes(runRules(data).deficiencies)).toContain("X1");
  });

  it("falls back to the name when an ID is missing on one side", () => {
    const naaf = cleanNaaf();
    const crq = cleanCrq();
    crq.crq_client_id = "";
    expect(checkSameClient(naaf, crq)).toMatchObject({ match: true, basis: "name" });

    crq.crq_client_name = "Someone, Else";
    expect(checkSameClient(naaf, crq)).toMatchObject({ match: false, basis: "name" });
  });

  it("cannot confirm identity when neither ID nor name is available on both", () => {
    const naaf = cleanNaaf();
    const crq = cleanCrq();
    crq.crq_client_id = "";
    crq.crq_client_name = "";
    expect(checkSameClient(naaf, crq)).toMatchObject({
      match: false,
      basis: "insufficient",
    });
  });
});

describe("X2 - risk profile ceiling", () => {
  it("flags a serious deficiency when the NAAF exceeds the CRQ ceiling", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "new", "High"); // CRQ ranking is Medium
    const x2 = runRules(data).results.find((r) => r.code === "X2");
    expect(x2?.status).toBe("deficiency");
    expect(x2?.serious).toBe(true);
    expect(x2?.message).toContain("High");
  });

  it("treats an under-risk NAAF as an informational note, not a deficiency", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "new", "Low");
    const report = runRules(data);
    const x2 = report.results.find((r) => r.code === "X2");
    expect(x2?.status).toBe("note");
    expect(report.clean).toBe(true);
  });

  it("passes when the two are equal", () => {
    expect(runRules(clean()).results.find((r) => r.code === "X2")?.status).toBe("ok");
  });

  it("compares the CEILING against the highest plan, not the first plan", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "new", "Low");
    data.naaf.naaf_plans[0].time_horizon_new = "10 - 20 Years";
    setPlanRisk(data.naaf.naaf_plans[1], "new", "High"); // the breach
    data.naaf.naaf_plans[1].time_horizon_new = "10 - 20 Years";

    const max = maxPlanRisk(data.naaf);
    expect(max).toMatchObject({ value: "High", plan_index: 2 });

    const x2 = runRules(data).results.find((r) => r.code === "X2");
    expect(x2?.status).toBe("deficiency");
    expect(x2?.message).toContain("Plan 2");
  });

  it("ignores incomplete plans when computing the maximum", () => {
    const data = clean();
    // A risk tolerance with no time horizon is not a completed plan.
    setPlanRisk(data.naaf.naaf_plans[1], "new", "High");
    expect(maxPlanRisk(data.naaf)).toMatchObject({ value: "Medium", plan_index: 1 });
    expect(runRules(data).results.find((r) => r.code === "X2")?.status).toBe("ok");
  });

  it("[CONFIRM #2] reads the New column, falling back to Current when New is blank", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "current", "Low");
    setPlanRisk(data.naaf.naaf_plans[0], "new", "High");
    expect(maxPlanRisk(data.naaf)?.value).toBe("High");

    setPlanRisk(data.naaf.naaf_plans[0], "new", null);
    expect(maxPlanRisk(data.naaf)?.value).toBe("Low");
  });

  it("[CONFIRM #2] honours a Current-column-first config", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "current", "Low");
    setPlanRisk(data.naaf.naaf_plans[0], "new", "High");
    const config = { ...DEFAULT_CONFIG, planRiskColumnPriority: "current" as const };
    expect(maxPlanRisk(data.naaf, config)?.value).toBe("Low");
  });

  it("stays silent when there is nothing to compare", () => {
    const data = clean();
    data.crq.crq_checked_risk_ranking = null;
    expect(runRules(data).results.find((r) => r.code === "X2")).toBeUndefined();
  });
});

describe("X3 - income band match", () => {
  it("passes when both forms agree despite different wording", () => {
    const data = clean();
    data.naaf.naaf_income_band = "Under $25,000";
    data.crq.crq_income_band = "Less than $25,000";
    expect(runRules(data).results.find((r) => r.code === "X3")?.status).toBe("ok");
  });

  it("passes on the top band despite different wording", () => {
    const data = clean();
    data.naaf.naaf_income_band = "$1 Million and Over";
    data.crq.crq_income_band = "$1,000,000 or more";
    expect(runRules(data).results.find((r) => r.code === "X3")?.status).toBe("ok");
  });

  it("flags a genuine mismatch", () => {
    const data = clean();
    data.crq.crq_income_band = "$25,000 - $49,999";
    const x3 = runRules(data).results.find((r) => r.code === "X3");
    expect(x3?.status).toBe("deficiency");
    expect(x3?.message).toContain("$75,000 - $99,999");
    expect(x3?.message).toContain("$25,000 - $49,999");
  });

  it("defers to N2 rather than reporting a mismatch when a band is missing", () => {
    const data = clean();
    data.naaf.naaf_income_band = null;
    const report = runRules(data);
    expect(report.results.find((r) => r.code === "X3")).toBeUndefined();
    expect(codes(report.deficiencies)).toContain("N2");
  });
});

describe("X4 - CRQ scoring self-check", () => {
  it("flags an advisor scoring error", () => {
    const data = clean();
    data.crq.crq_risk_capacity_total = 50; // High
    data.crq.crq_risk_tolerance_total = 20; // Low Medium -> lower wins
    data.crq.crq_checked_risk_ranking = "High"; // advisor took the higher one
    const x4 = runRules(data).results.find((r) => r.code === "X4");
    expect(x4?.status).toBe("deficiency");
    expect(x4?.remediation).toContain("Low Medium");
  });

  it("passes when the checked ranking matches the totals", () => {
    expect(runRules(clean()).results.find((r) => r.code === "X4")?.status).toBe("ok");
  });

  it("flags an incomplete Risk Profile Summary", () => {
    const data = clean();
    data.crq.crq_risk_capacity_total = null;
    expect(runRules(data).results.find((r) => r.code === "X4")?.status).toBe("deficiency");
  });
});

describe("N1-N7 - NAAF completeness", () => {
  it("N1 flags a missing client ID", () => {
    const data = clean();
    data.naaf.naaf_client_id = "";
    expect(codes(runRules(data).deficiencies)).toContain("N1");
  });

  it("N1 flags an implausible client ID", () => {
    const data = clean();
    data.naaf.naaf_client_id = "--";
    expect(codes(runRules(data).deficiencies)).toContain("N1");
  });

  it("N2 flags missing net worth", () => {
    const data = clean();
    data.naaf.naaf_net_worth = "";
    expect(codes(runRules(data).deficiencies)).toContain("N2");
  });

  it("N3 flags when no plan is completed", () => {
    const data = clean();
    data.naaf.naaf_plans[0].time_horizon_new = null;
    expect(codes(runRules(data).deficiencies)).toContain("N3");
  });

  it("N4 treats any missing TCP field as a deficiency", () => {
    const data = clean();
    data.naaf.naaf_tcp.phone = "";
    const n4 = runRules(data).deficiencies.find((r) => r.code === "N4");
    expect(n4?.message).toContain("phone number");
  });

  it("N5 requires a description and initials when OBA is applicable", () => {
    const data = clean();
    data.naaf.naaf_oba_not_applicable = false;
    expect(codes(runRules(data).deficiencies)).toContain("N5");
  });

  it("N5 requires joint initials only on a joint account", () => {
    const data = clean();
    data.naaf.naaf_oba_not_applicable = false;
    data.naaf.naaf_oba_description = "Part-time bookkeeping";
    data.naaf.naaf_oba_primary_initials = "MT";
    expect(codes(runRules(data).deficiencies)).not.toContain("N5");

    data.naaf.naaf_is_joint = true;
    data.naaf.naaf_client_signatures = [
      { signature_present: true, date_present: true },
      { signature_present: true, date_present: true },
    ];
    expect(codes(runRules(data).deficiencies)).toContain("N5");
  });

  it("N6 requires both signatures on a joint account", () => {
    const data = clean();
    data.naaf.naaf_is_joint = true;
    data.naaf.naaf_client_b_name = "Tremblay, Paul";
    // Only the primary holder signed.
    data.naaf.naaf_client_signatures = [{ signature_present: true, date_present: true }];
    expect(codes(runRules(data).deficiencies)).toContain("N6");
  });

  it("N6 flags a signature with no date", () => {
    const data = clean();
    data.naaf.naaf_client_signatures = [{ signature_present: true, date_present: false }];
    const n6 = runRules(data).deficiencies.find((r) => r.code === "N6");
    expect(n6?.message).toContain("not dated");
  });

  it("N7 flags missing advisor signature", () => {
    const data = clean();
    data.naaf.naaf_advisor_signature_present = false;
    expect(codes(runRules(data).deficiencies)).toContain("N7");
  });
});

describe("N8 - risk vs. time horizon red flag", () => {
  it("flags High risk against a short horizon", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "new", "High");
    data.naaf.naaf_plans[0].time_horizon_new = "Less than 1 Year";
    data.crq.crq_checked_risk_ranking = "High"; // isolate N8 from X2
    data.crq.crq_risk_capacity_total = 50;
    data.crq.crq_risk_tolerance_total = 50;

    const n8 = runRules(data).deficiencies.filter((r) => r.code === "N8");
    expect(n8).toHaveLength(1);
    expect(n8[0].message).toContain("Plan 1");
    expect(n8[0].message).toContain("High");
    expect(n8[0].message).toContain("Less than 1 Year");
  });

  it("flags Medium to High against 1 - 3 Years", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "new", "Medium to High");
    data.naaf.naaf_plans[0].time_horizon_new = "1 - 3 Years";
    data.crq.crq_checked_risk_ranking = "Medium High";
    data.crq.crq_risk_capacity_total = 40;
    data.crq.crq_risk_tolerance_total = 40;
    expect(runRules(data).deficiencies.filter((r) => r.code === "N8")).toHaveLength(1);
  });

  it("does not flag an elevated risk against a long horizon", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "new", "High");
    data.naaf.naaf_plans[0].time_horizon_new = "Over 20 Years";
    data.crq.crq_checked_risk_ranking = "High";
    data.crq.crq_risk_capacity_total = 50;
    data.crq.crq_risk_tolerance_total = 50;
    expect(runRules(data).deficiencies.filter((r) => r.code === "N8")).toHaveLength(0);
  });

  it("does not flag Medium risk against a short horizon", () => {
    const data = clean();
    data.naaf.naaf_plans[0].time_horizon_new = "Less than 1 Year";
    expect(runRules(data).deficiencies.filter((r) => r.code === "N8")).toHaveLength(0);
  });

  it("reports each offending plan separately, keyed by plan", () => {
    const data = clean();
    setPlanRisk(data.naaf.naaf_plans[0], "new", "High");
    data.naaf.naaf_plans[0].time_horizon_new = "Less than 1 Year";
    setPlanRisk(data.naaf.naaf_plans[2], "new", "Medium to High");
    data.naaf.naaf_plans[2].time_horizon_new = "1 - 3 Years";
    data.crq.crq_checked_risk_ranking = "High";
    data.crq.crq_risk_capacity_total = 50;
    data.crq.crq_risk_tolerance_total = 50;

    const n8 = runRules(data).deficiencies.filter((r) => r.code === "N8");
    expect(n8).toHaveLength(2);
    expect(n8.map((r) => r.key)).toEqual(["N8-plan-1", "N8-plan-3"]);
  });
});

describe("report shape", () => {
  it("sorts serious findings to the top for the reviewer and the email", () => {
    const data = clean();
    data.naaf.naaf_tcp.phone = ""; // N4, ordinary
    setPlanRisk(data.naaf.naaf_plans[0], "new", "High"); // X2, serious
    const report = runRules(data);
    expect(report.deficiencies[0].code).toBe("X2");
  });

  it("every result carries a code, a message, and a remediation when deficient", () => {
    const data = clean();
    data.naaf.naaf_client_id = "";
    data.naaf.naaf_tcp.email = "";
    for (const d of runRules(data).deficiencies) {
      expect(d.message.length).toBeGreaterThan(0);
      expect(d.remediation.length).toBeGreaterThan(0);
    }
  });
});

describe("X4 across the two CRQ revisions", () => {
  it("scores crq24's capacity and tolerance on their own tables", () => {
    const data = clean();
    data.crq.crq_form_version = "crq24";
    data.crq.crq_risk_capacity_total = 72; // > 70   -> High
    data.crq.crq_risk_tolerance_total = 46; // 41-50 -> Medium High
    data.crq.crq_checked_risk_ranking = "Medium High"; // the lower of the two
    expect(runRules(data).results.find((r) => r.code === "X4")?.status).toBe("ok");
  });

  it("would have called the same crq24 totals wrong on the other revision", () => {
    // The identical pair read as v2-crq25: 72 -> High, 46 -> Medium High. It
    // agrees here by coincidence, so use a pair where the tables diverge.
    const data = clean();
    data.crq.crq_form_version = "crq24";
    data.crq.crq_risk_capacity_total = 55; // crq24: 51-60 -> Medium
    data.crq.crq_risk_tolerance_total = 25; // crq24: 20-30 -> Low Medium
    data.crq.crq_checked_risk_ranking = "Low Medium";
    expect(runRules(data).results.find((r) => r.code === "X4")?.status).toBe("ok");

    data.crq.crq_form_version = "v2-crq25"; // 55 -> High, 25 -> Medium
    const wrong = runRules(data).results.find((r) => r.code === "X4");
    expect(wrong?.status).toBe("deficiency");
    expect(wrong?.message).toContain("Medium");
  });

  it("holds the check back, visibly, when the revision is unknown", () => {
    const data = clean();
    data.crq.crq_form_version = null;
    const x4 = runRules(data).results.find((r) => r.code === "X4");
    expect(x4?.status).toBe("note");
    expect(x4?.message).toContain("revision could not be determined");
  });
});

describe("X3 across income scales that do not line up", () => {
  it("accepts a NAAF band contained in a wider crq24 band", () => {
    const data = clean();
    data.crq.crq_form_version = "crq24";
    data.naaf.naaf_income_band = "$75,000 - $99,999";
    data.crq.crq_income_band = "$75,000 - $149,999";
    expect(runRules(data).results.find((r) => r.code === "X3")?.status).toBe("ok");
  });

  it("flags a partial overlap the two answers cannot both explain", () => {
    const data = clean();
    data.crq.crq_form_version = "crq24";
    data.naaf.naaf_income_band = "$125,000 - $199,999";
    data.crq.crq_income_band = "$75,000 - $149,999";
    const x3 = runRules(data).results.find((r) => r.code === "X3");
    expect(x3?.status).toBe("deficiency");
    expect(x3?.message).toContain("partly overlap");
  });

  it("still flags bands that share no income", () => {
    const data = clean();
    data.crq.crq_form_version = "crq24";
    data.crq.crq_income_band = "$250,000 or more";
    expect(runRules(data).results.find((r) => r.code === "X3")?.status).toBe("deficiency");
  });
});

describe("a form revision the tool does not know", () => {
  /** Same review, but nothing identified which form the advisor is holding. */
  const unknownRevision = (): ReviewData => {
    const data = clean();
    data.naaf.naaf_doc_kind = null;
    return data;
  };

  it("quotes no section letter anywhere", () => {
    const report = runRules(unknownRevision());
    for (const r of report.results) {
      expect(r.message).not.toMatch(/\bSection [A-Z]\b/);
      expect(r.remediation).not.toMatch(/\bSection [A-Z]\b/);
    }
  });

  it("names the section instead, so the advisor still knows where to look", () => {
    const data = unknownRevision();
    data.naaf.naaf_tcp.phone = "";
    const n4 = runRules(data).deficiencies.find((d) => d.code === "N4");
    expect(n4?.message).toContain("Trusted Contact Person section");
  });

  it("still runs the outside business activities check", () => {
    // Skipping it is only correct for a form KNOWN to omit the section. An
    // unrecognised revision probably has one, and a check that never ran is
    // indistinguishable from a check that passed.
    const codes = runRules(unknownRevision()).results.map((r) => r.code);
    expect(codes).toContain("N5");
  });

  it("keeps skipping it on a KYC, which genuinely has no such section", () => {
    const data = clean();
    data.naaf.naaf_doc_kind = "KYC";
    expect(runRules(data).results.map((r) => r.code)).not.toContain("N5");
  });

  it("does not name a form it cannot identify", () => {
    const data = unknownRevision();
    data.naaf.naaf_tcp.phone = "";
    const n4 = runRules(data).deficiencies.find((d) => d.code === "N4");
    expect(n4?.remediation).not.toContain("NAAF");
    expect(n4?.remediation).not.toContain("KYC Update");
  });
});
