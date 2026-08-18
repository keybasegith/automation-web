/**
 * Extraction against the real forms.
 *
 * The unit tests elsewhere prove the rules engine reasons correctly about data
 * it is handed. These prove the data it is handed is right — which is where
 * this tool previously failed: on a filled, typed NAAF the old extractor
 * resolved three of nine tracked fields and none of the enums, because the
 * forms export option INDICES while the code matched printed labels.
 *
 * Every expectation below is a claim about a document committed to /public, so
 * a form revision that moves a field breaks a test instead of quietly
 * pre-filling a blank for a reviewer to rubber-stamp.
 */

import { describe, expect, it } from "vitest";
import {
  MISSING_FORMS_NOTE,
  blankFormsPresent,
  CRQ_CORPORATE_PATH,
  CRQ_INDIVIDUAL_PATH,
  CRQ_JOINT_PATH,
  KYC_PATH,
  NAAF_PATH,
  fillForm,
} from "./formFixtures";
import { detectDocKind, extractCrq, extractNaaf } from "../extract";
import { effectivePlanRisk, maxPlanRisk, runRules } from "../rules";

const present = blankFormsPresent();
if (!present) console.warn(MISSING_FORMS_NOTE);
const describeForms = present ? describe : describe.skip;

/**
 * A NAAF filled the way a typed submission arrives. The two risk columns are
 * deliberately different so the column priority is actually exercised: Current
 * is wholly Medium, New is split 60 Medium / 40 High.
 */
const NAAF_FILL = {
  text: {
    CCode: "884213",
    txtLastName: "Doe",
    txtFirstName: "Jane",
    txtTotalAsset: "250000",
    "1PlanID": "RRSP-001",
    // Plan 1 Current column.
    "1PRiskTolerence_Medium_Per": "100",
    // Plan 1 New column — note the bare `zper_*` names, which is how the NAAF
    // (but not the KYC) spells its first block.
    zper_m: "60",
    zper_h: "40",
    "1TrustedContactPersonLastName": "Roe",
    "1TrustedContactPersonFirstName": "Sam",
    "1TrustedContactPersonCellPhone": "416-555-0134",
    "1TrustedContactPersonEmail": "sam.roe@example.com",
    "1TrustedContactPersonRelationshipStr": "Brother",
    oba: "Part-time insurance agency",
    sigClient1_1: "JD", // Section L initials — NOT the signature
    sigClient1_2: "Jane Doe", // Section M signature
    sigClientDate1_2: "2026-08-18",
    txtDealerCode: "KFG",
    txtRepCode: "1234",
    txtRepNameFL: "Jane Doe",
    sigAdvisor1_1: "Jane Doe",
    sigAdvisorDate1_1: "2026-08-18",
  },
  buttons: {
    nIncome: "3", // fourth printed band
    "1PLiquidity": "4", // fifth printed range, Current column
    zli2: "Yes", // second printed range, New column
  },
};

describeForms("NAAF — real form", () => {
  it("is recognised as a NAAF and read from the text layer", async () => {
    const read = await fillForm(NAAF_PATH, NAAF_FILL);
    expect(detectDocKind(read.text)).toBe("NAAF");
    expect(extractNaaf(read).mode).toBe("parsed");
  });

  it("pre-fills identity, KYC figures and advisor details", async () => {
    const { data } = await fillForm(NAAF_PATH, NAAF_FILL).then(extractNaaf);
    expect(data.naaf_doc_kind).toBe("NAAF");
    expect(data.naaf_client_id).toBe("884213");
    expect(data.naaf_client_name).toBe("Doe, Jane");
    expect(data.naaf_net_worth).toBe("250000");
    expect(data.naaf_rep_code).toBe("1234");
    expect(data.naaf_dealer_code).toBe("KFG");
    expect(data.naaf_advisor_name).toBe("Jane Doe");
    expect(data.naaf_advisor_signature_present).toBe(true);
    expect(data.naaf_advisor_date_present).toBe(true);
  });

  it("decodes the income band from its export index, not its label", async () => {
    const { data } = await fillForm(NAAF_PATH, NAAF_FILL).then(extractNaaf);
    expect(data.naaf_income_band).toBe("$75,000 - $99,999");
  });

  it("reads the risk spread into both columns", async () => {
    const { data } = await fillForm(NAAF_PATH, NAAF_FILL).then(extractNaaf);
    const plan = data.naaf_plans[0];
    expect(plan.plan_id).toBe("RRSP-001");
    expect(plan.risk_allocation_current.Medium).toBe(100);
    expect(plan.risk_allocation_current.High).toBeNull();
    expect(plan.risk_allocation_new.Medium).toBe(60);
    expect(plan.risk_allocation_new.High).toBe(40);
  });

  it("resolves the plan to the highest funded band of the New column", async () => {
    const { data } = await fillForm(NAAF_PATH, NAAF_FILL).then(extractNaaf);
    expect(effectivePlanRisk(data.naaf_plans[0])).toBe("High");
    expect(maxPlanRisk(data)?.value).toBe("High");
  });

  it("keeps the two time-horizon columns apart", async () => {
    const { data } = await fillForm(NAAF_PATH, NAAF_FILL).then(extractNaaf);
    expect(data.naaf_plans[0].time_horizon_current).toBe("10 - 20 Years");
    expect(data.naaf_plans[0].time_horizon_new).toBe("1 - 3 Years");
  });

  it("reads the trusted contact person", async () => {
    const { data } = await fillForm(NAAF_PATH, NAAF_FILL).then(extractNaaf);
    expect(data.naaf_tcp).toEqual({
      surname: "Roe",
      first_name: "Sam",
      phone: "416-555-0134",
      email: "sam.roe@example.com",
      relationship: "Brother",
    });
  });

  it("reads Section L, keeping the initials out of the signature block", async () => {
    const { data } = await fillForm(NAAF_PATH, NAAF_FILL).then(extractNaaf);
    expect(data.naaf_oba_description).toBe("Part-time insurance agency");
    expect(data.naaf_oba_primary_initials).toBe("JD");
    expect(data.naaf_client_signatures[0]).toEqual({
      signature_present: true,
      date_present: true,
    });
  });

  it("does not mistake the Section L initials for a client signature", async () => {
    // Section L initialled, Section M left blank: the signature rule must still
    // see an unsigned form.
    const read = await fillForm(NAAF_PATH, {
      text: { ...NAAF_FILL.text, sigClient1_2: "", sigClientDate1_2: "" },
      buttons: NAAF_FILL.buttons,
    });
    const { data } = extractNaaf(read);
    expect(data.naaf_oba_primary_initials).toBe("JD");
    expect(data.naaf_client_signatures[0]).toEqual({
      signature_present: false,
      date_present: false,
    });
  });

  it("reads the Section L Not Applicable box", async () => {
    const read = await fillForm(NAAF_PATH, {
      text: NAAF_FILL.text,
      buttons: { ...NAAF_FILL.buttons, zchkPage411: "Yes" },
    });
    expect(extractNaaf(read).data.naaf_oba_not_applicable).toBe(true);
  });
});

/** The KYC Update, whose first plan block spells its New column `1zper_*`. */
const KYC_FILL = {
  text: {
    CCode: "884213",
    txtLastName: "Doe",
    txtFirstName: "Jane",
    txtTotalAsset: "250000",
    "1PlanID": "RRSP-001",
    "1PRiskTolerence_Medium_Per": "100",
    "1zper_m": "60",
    "1zper_h": "40",
    "1TrustedContactPersonLastName": "Roe",
    "1TrustedContactPersonFirstName": "Sam",
    "1TrustedContactPersonCellPhone": "416-555-0134",
    "1TrustedContactPersonEmail": "sam.roe@example.com",
    "1TrustedContactPersonRelationshipStr": "Brother",
    sigClient1_1: "Jane Doe", // Section F signature — block 1 on this form
    sigClientDate1_1: "2026-08-18",
    txtDealerCode: "KFG",
    txtRepCode: "1234",
    txtRepNameFL: "Jane Doe",
    sigAdvisor1_1: "Jane Doe",
    sigAdvisorDate1_1: "2026-08-18",
  },
  buttons: {
    nIncome: "3",
    "1PLiquidity": "4",
    zli2: "Yes",
  },
};

describeForms("KYC Update — real form", () => {
  it("is recognised as a KYC, not a NAAF", async () => {
    const read = await fillForm(KYC_PATH, KYC_FILL);
    expect(detectDocKind(read.text)).toBe("KYC");
    expect(extractNaaf(read).data.naaf_doc_kind).toBe("KYC");
  });

  it("reads the same fields through the same code path", async () => {
    const { data } = await fillForm(KYC_PATH, KYC_FILL).then(extractNaaf);
    expect(data.naaf_client_id).toBe("884213");
    expect(data.naaf_client_name).toBe("Doe, Jane");
    expect(data.naaf_income_band).toBe("$75,000 - $99,999");
    expect(data.naaf_rep_code).toBe("1234");
    expect(data.naaf_tcp.surname).toBe("Roe");
  });

  it("reads its differently-named New risk column", async () => {
    const { data } = await fillForm(KYC_PATH, KYC_FILL).then(extractNaaf);
    expect(data.naaf_plans[0].risk_allocation_new.Medium).toBe(60);
    expect(data.naaf_plans[0].risk_allocation_new.High).toBe(40);
    expect(effectivePlanRisk(data.naaf_plans[0])).toBe("High");
  });

  it("takes its client signature from block 1", async () => {
    const { data } = await fillForm(KYC_PATH, KYC_FILL).then(extractNaaf);
    expect(data.naaf_client_signatures[0]).toEqual({
      signature_present: true,
      date_present: true,
    });
  });

  it("never raises an Outside Business Activities deficiency", async () => {
    const naaf = (await fillForm(KYC_PATH, KYC_FILL).then(extractNaaf)).data;
    const crq = (await fillForm(CRQ_INDIVIDUAL_PATH, CRQ_FILL).then(extractCrq)).data;
    const report = runRules({ naaf, crq });
    expect(report.results.map((r) => r.code)).not.toContain("N5");
  });
});

const CRQ_FILL = {
  text: {
    CCode: "884213",
    txtNameFL: "Doe, Jane",
    Total1: "30",
    Total2: "30",
    txtRepNameFL: "Jane Doe",
    sigClient1_1: "Jane Doe",
    sigClientDate1_1: "2026-08-18",
    sigAdvisor1_1: "Jane Doe",
    sigAdvisorDate1_1: "2026-08-18",
  },
  buttons: {
    "5a": "4", // Q3 annual income, fourth option
    RR1: "3", // Medium
  },
};

describeForms("CRQ — all three real layouts", () => {
  const LAYOUTS: Array<[string, string, "Individual" | "Joint" | "Corporate"]> = [
    ["individual", CRQ_INDIVIDUAL_PATH, "Individual"],
    ["joint", CRQ_JOINT_PATH, "Joint"],
    ["corporate", CRQ_CORPORATE_PATH, "Corporate"],
  ];

  for (const [name, path, version] of LAYOUTS) {
    it(`reads the ${name} layout`, async () => {
      const { data, mode } = await fillForm(path, CRQ_FILL).then(extractCrq);
      expect(mode).toBe("parsed");
      // The Corporate title is letter-spaced on the page and reaches the text
      // layer as "C or p orate Account s".
      expect(data.crq_version).toBe(version);
      expect(data.crq_client_id).toBe("884213");
      expect(data.crq_client_name).toBe("Doe, Jane");
      expect(data.crq_risk_capacity_total).toBe(30);
      expect(data.crq_risk_tolerance_total).toBe(30);
      expect(data.crq_advisor_name).toBe("Jane Doe");
      expect(data.crq_client_signature_present).toBe(true);
      expect(data.crq_advisor_date_present).toBe(true);
    });
  }

  it("decodes the income band from a 1-based index", async () => {
    // The CRQ numbers its options from 1 while the NAAF numbers from 0; reading
    // either with the other's base lands one band off.
    const { data } = await fillForm(CRQ_INDIVIDUAL_PATH, CRQ_FILL).then(extractCrq);
    expect(data.crq_income_band).toBe("$75,000 - $99,999");
  });

  it("decodes the checked risk ranking", async () => {
    const { data } = await fillForm(CRQ_INDIVIDUAL_PATH, CRQ_FILL).then(extractCrq);
    expect(data.crq_checked_risk_ranking).toBe("Medium");
  });
});

describeForms("end to end, on the real documents", () => {
  it("flags the plan that sits above the CRQ ranking", async () => {
    const naaf = (await fillForm(NAAF_PATH, NAAF_FILL).then(extractNaaf)).data;
    const crq = (await fillForm(CRQ_INDIVIDUAL_PATH, CRQ_FILL).then(extractCrq)).data;
    const report = runRules({ naaf, crq });

    // The New column funds the High band while the CRQ ranks the client Medium.
    const x2 = report.deficiencies.find((d) => d.code === "X2");
    expect(x2).toBeDefined();
    expect(x2?.serious).toBe(true);

    // Same client, same income band on both documents.
    expect(report.results.find((r) => r.code === "X1")?.status).toBe("ok");
    expect(report.results.find((r) => r.code === "X3")?.status).toBe("ok");
  });

  it("cites the section letters printed on the form in hand", async () => {
    const naafReport = runRules({
      naaf: (await fillForm(NAAF_PATH, { text: {}, buttons: {} }).then(extractNaaf)).data,
      crq: (await fillForm(CRQ_INDIVIDUAL_PATH, CRQ_FILL).then(extractCrq)).data,
    });
    const kycReport = runRules({
      naaf: (await fillForm(KYC_PATH, { text: {}, buttons: {} }).then(extractNaaf)).data,
      crq: (await fillForm(CRQ_INDIVIDUAL_PATH, CRQ_FILL).then(extractCrq)).data,
    });

    const tcpOn = (r: typeof naafReport) =>
      r.results.find((x) => x.code === "N4")?.message ?? "";
    expect(tcpOn(naafReport)).toContain("Section I");
    expect(tcpOn(kycReport)).toContain("Section E");

    const advisorOn = (r: typeof naafReport) =>
      r.results.find((x) => x.code === "N7")?.message ?? "";
    expect(advisorOn(naafReport)).toContain("Section N");
    expect(advisorOn(kycReport)).toContain("Section G");
  });
});
