import { describe, expect, it } from "vitest";

import { blankNaaf, blankPlan } from "../blank";
import { allocationTotal, checkNaaf, fieldIds, netWorth, parseMoney } from "../completeness";
import type { HolderInfo, NaafState } from "../types";

/** Synthetic people only — this repository is public. */
const person = (overrides: Partial<HolderInfo> = {}): HolderInfo => ({
  ...blankNaaf().clientA,
  holderType: "Ms.",
  gender: "Female",
  surname: "Sample",
  firstName: "Alex",
  sin: "000 000 000",
  dob: "01/01/80",
  address: "1 Example St",
  city: "Toronto",
  province: "ON",
  postalCode: "A1A 1A1",
  cellPhone: "555-0100",
  email: "alex@example.com",
  idMethod: "photo",
  idType: "Driver's Licence",
  documentId: "X0000-00000-00000",
  dateOfIssue: "2022-01-01",
  placeOfIssue: "Toronto",
  jurisdiction: "ON",
  issuingCountry: "Canada",
  dateOfExpiry: "2027-01-01",
  pep: "No",
  pepAssociate: "No",
  citizenship: "Canadian",
  employer: "Example Co.",
  businessType: "Retail",
  employerAddress: "2 Example St",
  occupation: "Manager",
  maritalStatus: "Single",
  dependants: "0",
  ...overrides,
});

/** A single-holder application with every applicable box filled in and signed. */
function completeNaaf(): NaafState {
  const s = blankNaaf();
  s.formType = "New Client";
  s.clientId = "KB12345";
  s.clientA = person();
  s.kyc.A = {
    income: "$50,000 - $74,999",
    netWorth: { liquidAssets: "50,000", fixedAssets: "400000", liabilities: "250000" },
    knowledge: "Fair",
    experience: ["Mutual Funds"],
  };
  s.plans[0] = {
    ...blankPlan(),
    planIdType: "RRSP",
    owner: "A",
    registration: "client",
    accountType: "RRSP",
    leverage: "No",
    objectives: {
      current: blankPlan().objectives.current,
      new: { Safety: "", Income: "40", Balanced: "", Growth: "60", Speculation: "" },
    },
    riskTolerance: {
      current: blankPlan().riskTolerance.current,
      new: { Low: "", "Low to Medium": "30", Medium: "70", "Medium to High": "", High: "" },
    },
    timeHorizon: { current: null, new: "10 - 20 Years" },
    intendedUse: { current: [], new: ["Retirement Planning"] },
    thirdParty: { financialInterest: "No", tradingAuthorization: "No", makingDeposits: "No" },
  };
  s.tcp = { surname: "Contact", firstName: "Sam", phone: "555-0101", email: "sam@example.com", relationship: "Sibling" };
  s.caslConsent = true;
  s.eddConsent = true;
  s.oba.notApplicable = true;
  s.clientSignatures[0] = { signature: "data:image/png;base64,AAAA", date: "2026-09-25" };
  s.advisor = {
    dealerCode: "0000",
    repCode: "R000",
    answers: { metInPerson: "Yes", verifiedId: "Yes", providedRdd: "Yes", directInterest: "No" },
    name: "Advisor Example",
    signature: "data:image/png;base64,BBBB",
    date: "2026-09-25",
  };
  return s;
}

const ids = (s: NaafState) => checkNaaf(s).issues.map((i) => i.fieldId);

describe("checkNaaf", () => {
  it("passes a fully completed single-holder application", () => {
    const report = checkNaaf(completeNaaf());
    expect(report.issues).toEqual([]);
    expect(report.complete).toBe(true);
  });

  it("flags an empty form, starting with the form type, and is not complete", () => {
    const report = checkNaaf(blankNaaf());
    expect(report.complete).toBe(false);
    expect(report.issues[0].fieldId).toBe(fieldIds.formType);
    expect(report.signatures).toBe(2); // one client + the advisor
  });

  it("reports each missing signature separately from its date", () => {
    const s = completeNaaf();
    s.clientSignatures[0].signature = null;
    s.advisor.date = "";
    const report = checkNaaf(s);
    expect(report.issues).toEqual([
      expect.objectContaining({ fieldId: fieldIds.clientSignature(0), kind: "signature" }),
      expect.objectContaining({ fieldId: fieldIds.advisor("date"), kind: "blank" }),
    ]);
  });

  it("requires Client B, the second signature and joint initials only on a joint application", () => {
    const single = completeNaaf();
    single.oba = { notApplicable: false, description: "Insurance through Example Agency", primaryInitials: "AS", jointInitials: "" };
    expect(checkNaaf(single).complete).toBe(true);

    const joint = { ...single, hasJointHolder: true };
    const found = ids(joint);
    expect(found).toContain(fieldIds.holder("B", "surname"));
    expect(found).toContain(fieldIds.kyc("B", "income"));
    expect(found).toContain(fieldIds.oba("jointInitials"));
    expect(found).toContain(fieldIds.clientSignature(1));
  });

  it("skips Client B's address when it is the same as Client A's", () => {
    const s = completeNaaf();
    s.hasJointHolder = true;
    s.clientB = person({ relationshipToA: "Spouse", addressSameAsA: true, address: "", city: "", province: "", postalCode: "" });
    expect(ids(s).filter((id) => id.startsWith("naaf-B-"))).toEqual([]);
  });

  it("asks for spouse details only when the spouse is not the joint applicant", () => {
    const married = completeNaaf();
    married.clientA.maritalStatus = "Married";
    expect(ids(married)).toContain(fieldIds.holder("A", "spouseLastName"));

    married.hasJointHolder = true;
    married.clientB = person({ relationshipToA: "Spouse", maritalStatus: "Married" });
    married.kyc.B = married.kyc.A;
    married.clientSignatures[1] = { signature: "data:image/png;base64,CCCC", date: "2026-09-25" };
    expect(ids(married)).not.toContain(fieldIds.holder("A", "spouseLastName"));
    expect(ids(married)).not.toContain(fieldIds.holder("B", "spouseLastName"));
  });

  it("does not ask an entity for a first name, gender, citizenship or employment", () => {
    const s = completeNaaf();
    s.clientA = person({ holderType: "Entity", gender: null, firstName: "", citizenship: null, employer: "", occupation: "", maritalStatus: null, dependants: "" });
    const found = ids(s);
    expect(found).not.toContain(fieldIds.holder("A", "firstName"));
    expect(found).not.toContain(fieldIds.holder("A", "gender"));
    expect(found).not.toContain(fieldIds.holder("A", "employer"));
    // …but a corporation must answer the For Corporations questions.
    expect(found).toContain(fieldIds.corporation("registeredCharity"));
  });

  it("accepts any one phone number", () => {
    const s = completeNaaf();
    s.clientA.cellPhone = "";
    expect(ids(s)).toContain(fieldIds.holder("A", "homePhone"));
    s.clientA.businessPhone = "555-0102";
    expect(ids(s)).not.toContain(fieldIds.holder("A", "homePhone"));
  });

  it("treats 0 as an answer and a blank as a blank in the net worth boxes", () => {
    const s = completeNaaf();
    s.kyc.A.netWorth.liabilities = "0";
    expect(checkNaaf(s).complete).toBe(true);
    s.kyc.A.netWorth.liabilities = "";
    expect(ids(s)).toContain(fieldIds.kyc("A", "liabilities"));
  });

  it("flags a plan allocation that does not total 100%", () => {
    const s = completeNaaf();
    s.plans[0].riskTolerance.new.Medium = "60";
    const issue = checkNaaf(s).issues.find((i) => i.fieldId === fieldIds.plan(0, "riskTolerance"));
    expect(issue).toMatchObject({ kind: "invalid" });
    expect(issue?.message).toContain("90%");
  });

  it("only checks Plans 2 and 3 once something is entered in them", () => {
    const s = completeNaaf();
    expect(ids(s).some((id) => id.startsWith("naaf-plan2-"))).toBe(false);
    s.plans[1] = { ...blankPlan(), planIdType: "TFSA" };
    expect(ids(s)).toContain(fieldIds.plan(1, "accountType"));
    expect(ids(s)).toContain(fieldIds.plan(1, "tp-makingDeposits"));
  });

  it("requires a beneficiary on ITF and RESP plans", () => {
    const s = completeNaaf();
    s.plans[0].accountType = "RESP-Indiv";
    const found = ids(s);
    expect(found).toContain(fieldIds.plan(0, "beneficiary-name"));
    expect(found).toContain(fieldIds.plan(0, "beneficiary-sin"));
  });

  it("points to Section B when a third party answer is YES and there is no Client B", () => {
    const s = completeNaaf();
    s.plans[0].thirdParty.tradingAuthorization = "Yes";
    expect(checkNaaf(s).issues).toContainEqual(
      expect.objectContaining({ fieldId: fieldIds.jointToggle, kind: "invalid" }),
    );
  });

  it("requires a description and initials unless OBA is Not Applicable", () => {
    const s = completeNaaf();
    s.oba.notApplicable = false;
    const found = ids(s);
    expect(found).toContain(fieldIds.oba("description"));
    expect(found).toContain(fieldIds.oba("primaryInitials"));
  });

  it("surfaces unticked CASL / EDD consent for review without blocking the form", () => {
    const s = completeNaaf();
    s.caslConsent = false;
    s.eddConsent = false;
    const report = checkNaaf(s);
    expect(report.review).toBe(2);
    expect(report.complete).toBe(true);
  });

  it("does not require banking details unless the block has been started", () => {
    const s = completeNaaf();
    s.banking.bankName = "Example Bank";
    expect(ids(s)).toContain(fieldIds.banking("accountNumber"));
    s.banking.voidChequeOnFile = true;
    expect(ids(s)).not.toContain(fieldIds.banking("accountNumber"));
  });
});

describe("helpers", () => {
  it("parses dollar amounts as typed", () => {
    expect(parseMoney("$1,250.50")).toBe(1250.5);
    expect(parseMoney("0")).toBe(0);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("lots")).toBeNull();
  });

  it("computes net worth as fixed + liquid − liabilities", () => {
    expect(netWorth(completeNaaf().kyc.A)).toBe(200000);
    expect(netWorth(blankNaaf().kyc.A)).toBeNull();
  });

  it("counts blank bands as 0 once a column is started", () => {
    expect(allocationTotal({ a: "", b: "" })).toEqual({ empty: true, total: null });
    expect(allocationTotal({ a: "40", b: "" })).toEqual({ empty: false, total: 40 });
    expect(allocationTotal({ a: "40%", b: "60" })).toEqual({ empty: false, total: 100 });
    expect(allocationTotal({ a: "140", b: "" })).toEqual({ empty: false, total: null });
  });
});
