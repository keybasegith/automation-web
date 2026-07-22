import { describe, expect, it } from "vitest";
import { blankCrq, blankNaaf } from "../blank";
import { DEFAULT_CONFIG } from "../config";
import { buildEmailDraft, mailtoHref } from "../email";
import { runRules } from "../rules";
import type { ReviewData } from "../types";

function reviewWith(mutate: (d: ReviewData) => void): ReviewData {
  const naaf = blankNaaf();
  naaf.naaf_client_id = "C-10045";
  naaf.naaf_client_name = "Tremblay, Marie";
  naaf.naaf_income_band = "$75,000 - $99,999";
  naaf.naaf_net_worth = "250000";
  naaf.naaf_plans[0].risk_tolerance_new = "Medium";
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

  const crq = blankCrq();
  crq.crq_version = "Individual";
  crq.crq_client_id = "C-10045";
  crq.crq_client_name = "Tremblay, Marie";
  crq.crq_income_band = "$75,000 - $99,999";
  crq.crq_risk_capacity_total = 30;
  crq.crq_risk_tolerance_total = 30;
  crq.crq_checked_risk_ranking = "Medium";

  const data: ReviewData = { naaf, crq };
  mutate(data);
  return data;
}

const draftFor = (data: ReviewData, config = DEFAULT_CONFIG) =>
  buildEmailDraft({
    report: runRules(data, config),
    advisorName: "Jane Doe",
    advisorEmail: "jdoe@firm.example",
    clientName: data.naaf.naaf_client_name,
    clientId: data.naaf.naaf_client_id,
    config,
  });

describe("buildEmailDraft", () => {
  it("addresses the resolved advisor by first name", () => {
    const draft = draftFor(reviewWith((d) => (d.naaf.naaf_tcp.phone = "")));
    expect(draft.to).toBe("jdoe@firm.example");
    expect(draft.body.startsWith("Hello Jane,")).toBe(true);
  });

  it("handles a Surname, First Name advisor spelling", () => {
    const draft = buildEmailDraft({
      report: runRules(reviewWith((d) => (d.naaf.naaf_tcp.phone = ""))),
      advisorName: "Doe, Jane",
      advisorEmail: "jdoe@firm.example",
      clientName: "Tremblay, Marie",
      clientId: "C-10045",
    });
    expect(draft.body.startsWith("Hello Jane,")).toBe(true);
  });

  it("names the client and ID in the subject", () => {
    const draft = draftFor(reviewWith((d) => (d.naaf.naaf_tcp.phone = "")));
    expect(draft.subject).toContain("New Account - Deficiency");
    expect(draft.subject).toContain("Tremblay, Marie");
    expect(draft.subject).toContain("C-10045");
  });

  it("aggregates every deficiency into a single itemised message", () => {
    const data = reviewWith((d) => {
      d.naaf.naaf_tcp.phone = ""; // N4
      d.naaf.naaf_advisor_signature_present = false; // N7
      d.crq.crq_income_band = "$25,000 - $49,999"; // X3
    });
    const report = runRules(data);
    const draft = draftFor(data);

    const bullets = draft.body.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets).toHaveLength(report.deficiencies.length);
    expect(draft.body).toContain("phone number");
    expect(draft.body).toContain("advisor's signature");
    expect(draft.body).toContain("$25,000 - $49,999");
  });

  it("states both the discrepancy and the required correction", () => {
    const data = reviewWith((d) => {
      d.naaf.naaf_plans[0].risk_tolerance_new = "High"; // X2 over-risk
    });
    const draft = draftFor(data);
    expect(draft.body).toContain("higher than the client's assessed risk ranking");
    expect(draft.body).toContain("Reduce the plan's risk tolerance");
  });

  it("uses the spec's wording for the N8 red flag", () => {
    const data = reviewWith((d) => {
      d.naaf.naaf_plans[0].risk_tolerance_new = "High";
      d.naaf.naaf_plans[0].time_horizon_new = "Less than 1 Year";
      d.crq.crq_checked_risk_ranking = "High";
      d.crq.crq_risk_capacity_total = 50;
      d.crq.crq_risk_tolerance_total = 50;
    });
    const draft = draftFor(data);
    expect(draft.body).toContain(
      "Plan 1: the selected risk tolerance (High) is inconsistent with the selected time horizon (Less than 1 Year)."
    );
    expect(draft.body).toContain("documented rationale");
  });

  it("omits informational notes by default", () => {
    const data = reviewWith((d) => {
      d.naaf.naaf_plans[0].risk_tolerance_new = "Low"; // X2 under-risk note
      d.naaf.naaf_tcp.phone = ""; // a real deficiency to carry the email
    });
    expect(draftFor(data).body).not.toContain("For your information");
  });

  it("includes notes when compliance turns them on", () => {
    const data = reviewWith((d) => {
      d.naaf.naaf_plans[0].risk_tolerance_new = "Low";
      d.naaf.naaf_tcp.phone = "";
    });
    const config = { ...DEFAULT_CONFIG, includeNotesInEmail: true };
    const draft = draftFor(data, config);
    expect(draft.body).toContain("For your information");
    expect(draft.body).toContain("no action required");
  });

  it("leads the email with the serious finding", () => {
    const data = reviewWith((d) => {
      d.naaf.naaf_tcp.phone = ""; // N4
      d.naaf.naaf_plans[0].risk_tolerance_new = "High"; // X2, serious
    });
    const bullets = draftFor(data).body.split("\n").filter((l) => l.startsWith("- "));
    expect(bullets[0]).toContain("risk");
  });
});

describe("mailtoHref", () => {
  it("builds a mailto link that opens the reviewer's own mail client", () => {
    // The tool drafts; the human sends. There is no transport here.
    const href = mailtoHref({
      to: "jdoe@firm.example",
      subject: "New Account - Deficiency - Tremblay, Marie",
      body: "Hello Jane,\n\n- Something is wrong.",
    });
    expect(href.startsWith("mailto:")).toBe(true);
    expect(href).toContain("subject=");
    expect(href).toContain("body=");
  });
});
