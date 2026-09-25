import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { fakeSignaturePng, syntheticCrq, syntheticNaaf } from "@/lib/pdf-forms/__tests__/fixtures";

import { blankDraft, editCrq, editNaaf, reviveDraft, setAccountKind, type OnboardingDraft } from "../draft";
import {
  applySignatures,
  cleanSignatures,
  generateDocuments,
  outstandingBeforeSigning,
  requiredSigners,
  signingDate,
} from "../finalize";
import { legacyRiskTolerance } from "../repo";
import { blockingBeforeSigning, findingsFor, stepForNaafIssue, stepStatus, stepsFor } from "../steps";
import { mockDraft } from "../mock";
import { requirementsFor } from "../supporting";
import type { NaafState } from "@/lib/naaf/types";

/** Synthetic data only — this repository is public. */
const joint = (): OnboardingDraft => ({ naaf: syntheticNaaf(), crq: syntheticCrq(), variant: "joint", supporting: {} });

describe("steps", () => {
  it("shows the joint step only for a joint account, and no employment step for an entity", () => {
    const ids = (d: OnboardingDraft) => stepsFor(d).map((s) => s.id);
    expect(ids(blankDraft("individual"))).not.toContain("joint");
    expect(ids(blankDraft("joint"))).toContain("joint");
    expect(ids(blankDraft("corporate"))).not.toContain("employment");
    expect(ids(blankDraft()).at(-1)).toBe("review");
  });

  it("files each NAAF finding under the screen that holds its box", () => {
    const at = (section: string, fieldId: string) =>
      stepForNaafIssue({ section: section as never, fieldId, kind: "blank", message: "" });
    expect(at("header", "naaf-form-type")).toBe("start");
    expect(at("A", "naaf-client-id")).toBe("start");
    expect(at("A", "naaf-A-surname")).toBe("holder");
    expect(at("A", "naaf-A-idType")).toBe("identity");
    expect(at("A", "naaf-A-employer")).toBe("employment");
    expect(at("B", "naaf-B-surname")).toBe("joint");
    expect(at("E", "naaf-plan2-accountType")).toBe("plans");
    expect(at("K", "naaf-edd")).toBe("contacts");
    expect(at("N", "naaf-advisor-repCode")).toBe("advisor");
    expect(at("N", "naaf-advisor-signature")).toBe("review");
    expect(at("M", "naaf-client-signature-1")).toBe("review");
  });

  it("marks every step of a blank application incomplete, and review holds the signatures", () => {
    const findings = findingsFor(blankDraft());
    expect(stepStatus(findings, "holder")).toBe("incomplete");
    expect(findings.filter((f) => f.step === "review" && f.kind === "signature").length).toBeGreaterThan(0);
  });
});

describe("draft editing", () => {
  it("carries the name typed on a NAAF screen into the CRQ", () => {
    const d = editNaaf(blankDraft(), (n) => ({ ...n, clientA: { ...n.clientA, firstName: "Alex", surname: "Sample" } }));
    expect(d.crq.accountHolderName).toBe("Alex Sample");
  });

  it("carries a CRQ answer the NAAF shares (income) back into the NAAF", () => {
    const d = editCrq(blankDraft(), (c) => ({ ...c, answers: { ...c.answers, q3: "q3_b" } }));
    expect(d.naaf.kyc.A.income).toBe("$25,000 - $49,999");
  });

  it("switching to corporate makes Client A an entity and back again clears it", () => {
    const corp = setAccountKind(blankDraft(), "corporate");
    expect(corp.naaf.clientA.holderType).toBe("Entity");
    expect(corp.variant).toBe("corporate");
    const back = setAccountKind(corp, "individual");
    expect(back.naaf.clientA.holderType).toBeNull();
    expect(setAccountKind(blankDraft(), "joint").naaf.hasJointHolder).toBe(true);
  });

  it("keeps an Estate or Trust type when the account is corporate", () => {
    const d = blankDraft("corporate");
    d.naaf.clientA.holderType = "Estate";
    expect(setAccountKind(setAccountKind(d, "corporate"), "corporate").naaf.clientA.holderType).toBe("Estate");
  });

  it("fills a partial draft at every depth, so a missing nested field cannot crash the PDF filler", () => {
    const revived = reviveDraft({ variant: "individual", naaf: { clientA: { firstName: "Alex", surname: 42 } }, crq: {} })!;
    expect(revived.naaf.clientA.firstName).toBe("Alex");
    expect(revived.naaf.clientA.surname).toBe(""); // wrong type dropped
    expect(revived.naaf.clientA.email).toBe("");
    expect(revived.naaf.kyc.B.netWorth.liabilities).toBe("");
  });

  it("revives a stored draft and rejects junk", () => {
    const stored = JSON.parse(JSON.stringify(joint()));
    delete stored.naaf.oba; // a field a later form version added
    const revived = reviveDraft(stored)!;
    expect(revived.variant).toBe("joint");
    expect(revived.naaf.oba).toEqual(blankDraft().naaf.oba);
    expect(revived.crq.answers).toEqual(joint().crq.answers);
    expect(revived.crq.portfolioPriorities).toEqual(joint().crq.portfolioPriorities);
    expect(revived.naaf.plans).toHaveLength(3);
    expect(reviveDraft("nope")).toBeNull();
    expect(reviveDraft({ naaf: null, crq: {} })).toBeNull();
  });
});

describe("signing", () => {
  it("needs the joint holder's signature only on a joint account", () => {
    expect(requiredSigners(joint())).toEqual(["client1", "client2", "advisor"]);
    expect(requiredSigners(blankDraft())).toEqual(["client1", "advisor"]);
  });

  it("applies each signature and today's date to both documents", () => {
    const sig = fakeSignaturePng(3);
    const d = applySignatures(blankDraft(), { client1: sig, advisor: sig }, "2026-09-25");
    expect(d.naaf.clientSignatures[0]).toEqual({ signature: sig, date: "2026-09-25" });
    expect(d.crq.accountHolderSignature).toBe(sig);
    expect(d.crq.accountHolderDate).toBe("2026-09-25");
    expect(d.naaf.advisor.date).toBe("2026-09-25");
    expect(d.crq.advisorDate).toBe("2026-09-25");
  });

  it("accepts only image data URLs as signatures", () => {
    expect(cleanSignatures({ client1: "javascript:alert(1)", advisor: fakeSignaturePng() })).toEqual({
      client1: null,
      client2: null,
      advisor: expect.stringMatching(/^data:image\/png;base64,/),
    });
  });

  it("dates signatures in Toronto time", () => {
    // 02:00 UTC on 26 Sep is still 25 Sep in Toronto.
    expect(signingDate(new Date("2026-09-26T02:00:00Z"))).toBe("2026-09-25");
  });

  it("does not let signing dates block sending for signature", () => {
    const d = joint();
    d.naaf.clientSignatures = [{ signature: null, date: "" }, { signature: null, date: "" }];
    d.naaf.advisor = { ...d.naaf.advisor, signature: null, date: "" };
    expect(outstandingBeforeSigning(d).filter((f) => /date/i.test(f.fieldId))).toEqual([]);
  });

  it("maps the CRQ ranking onto the Clients page's three risk levels", () => {
    expect(legacyRiskTolerance("Low Medium")).toBe("Low");
    expect(legacyRiskTolerance("Medium")).toBe("Medium");
    expect(legacyRiskTolerance("Medium High")).toBe("High");
    expect(legacyRiskTolerance(null)).toBeNull();
  });
});

describe("document generation", () => {
  it("fills and flattens both official forms from a signed joint draft", async () => {
    const sig = fakeSignaturePng(5);
    const signed = applySignatures(joint(), { client1: sig, client2: sig, advisor: sig }, "2026-09-25");
    const docs = await generateDocuments(signed, { origin: "http://localhost", flatten: true });

    for (const bytes of [docs.naaf, docs.crq]) {
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getForm().getFields()).toHaveLength(0); // flattened: nothing left to edit
    }
    expect((await PDFDocument.load(docs.naaf)).getPageCount()).toBe(4);
    expect((await PDFDocument.load(docs.crq)).getPageCount()).toBe(3);
    expect(docs.crqVariant).toBe("joint");
  });
});

describe("mock data", () => {
  it.each(["individual", "joint", "corporate"] as const)("a %s mock passes every NAAF and CRQ check except signing", (kind) => {
    const draft = mockDraft(kind);
    expect(blockingBeforeSigning(findingsFor(draft))).toEqual([]);
    for (const step of stepsFor(draft)) {
      if (step.id !== "review") expect([step.id, stepStatus(findingsFor(draft), step.id)]).toEqual([step.id, "complete"]);
    }
  });

  it.each(["individual", "joint", "corporate"] as const)("fills the official forms for a signed %s mock", async (kind) => {
    const sig = fakeSignaturePng(7);
    const signed = applySignatures(mockDraft(kind), { client1: sig, client2: kind === "joint" ? sig : null, advisor: sig }, "2026-09-25");
    const docs = await generateDocuments(signed, { origin: "http://localhost", flatten: true });
    expect((await PDFDocument.load(docs.naaf)).getPageCount()).toBe(4);
    expect(docs.crqVariant).toBe(kind);
  });

  it("is plainly fictional", () => {
    for (const kind of ["individual", "joint", "corporate"] as const) {
      const { naaf } = mockDraft(kind);
      expect(naaf.clientA.email).toMatch(/example\.com$/);
      expect(naaf.clientId).toMatch(/^DEMO-/);
    }
  });
});

describe("supporting documents", () => {
  const ids = (naaf: NaafState) => requirementsFor(naaf).map((r) => r.id);

  it("always needs ID and the tax residence declaration, per holder", () => {
    expect(ids(blankDraft().naaf)).toEqual(["id-A", "tax-residence-A"]);
    expect(ids(blankDraft("joint").naaf)).toEqual(["id-A", "id-B", "tax-residence-A", "tax-residence-B"]);
  });

  it("names RC519 for an entity and RC518 for a person", () => {
    const titles = (naaf: NaafState) => requirementsFor(naaf).map((r) => r.title).join(" ");
    expect(titles(mockDraft("corporate").naaf)).toContain("RC519");
    expect(titles(mockDraft("individual").naaf)).toContain("RC518");
  });

  it("adds a PEP declaration, void cheque, POA papers and the corporate resolution only when they apply", () => {
    const naaf = mockDraft("individual").naaf;
    expect(ids(naaf)).toContain("void-cheque");
    expect(ids(naaf)).not.toContain("pep-A");
    expect(ids(naaf)).not.toContain("poa");
    expect(ids(naaf)).not.toContain("corporate-authority");

    naaf.clientA.pepAssociate = "Yes";
    naaf.plans[0].thirdParty.tradingAuthorization = "Yes";
    naaf.banking.voidChequeOnFile = true;
    expect(ids(naaf)).toEqual(expect.arrayContaining(["pep-A", "poa"]));
    expect(ids(naaf)).not.toContain("void-cheque");
    expect(ids(mockDraft("corporate").naaf)).toContain("corporate-authority");
  });

  it("blocks signing until each required document is uploaded or confirmed on file", () => {
    const draft = mockDraft("individual");
    delete draft.supporting["tax-residence-A"];
    expect(blockingBeforeSigning(findingsFor(draft))).toEqual([
      expect.objectContaining({ step: "documents", fieldId: "supporting-tax-residence-A" }),
    ]);
  });
});

describe("gaps the wizard used to leave open", () => {
  it("ticks Client A as owner of every plan on a single-holder application", () => {
    const d = editNaaf(blankDraft(), (n) => ({ ...n, plans: n.plans.map((p, i) => (i === 0 ? { ...p, planIdType: "RRSP" } : p)) }));
    expect(d.naaf.plans[0].owner).toBe("A");
    expect(d.naaf.plans[1].owner).toBeNull(); // unused plans stay blank
  });

  it("lets a third party be added in Section B without making the account joint", () => {
    const draft = mockDraft("individual");
    draft.naaf.plans[0].thirdParty.tradingAuthorization = "Yes";
    expect(findingsFor(draft).some((f) => f.fieldId === "naaf-joint-toggle")).toBe(true);
    const withB = editNaaf(draft, (n) => ({ ...n, hasJointHolder: true }));
    expect(withB.variant).toBe("individual");
    expect(stepsFor(withB).find((s) => s.id === "joint")?.title).toBe("Third party (Section B)");
    expect(findingsFor(withB).some((f) => f.fieldId === "naaf-joint-toggle")).toBe(false);
  });
});
