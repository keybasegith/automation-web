/**
 * The joint and corporate editions: wording, scoring and validation.
 *
 * Wording is checked against each edition's own PDF, the same way
 * sourceFidelity.test.ts checks the individual edition. These PDFs' text
 * layers split words and hyphenate across lines ("accu- mulate", "invest -
 * ments", "entity ' s"), so the comparison ignores whitespace and rejoins a
 * word broken by a line-end hyphen.
 */

import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { blankQuestionnaire } from "../blank";
import { CRQ_FORMS } from "../forms";
import { deriveRiskProfile } from "../scoring";
import { buildSubmission } from "../submission";
import type { CrqVariant, QuestionnaireState } from "../types";
import { fieldIds, validateQuestionnaire } from "../validation";

const PDFS: Record<Exclude<CrqVariant, "individual">, string> = {
  joint: "crq-jointaccountholders.pdf",
  corporate: "crq-corporateaccounts.pdf",
};

const squash = (value: string): string =>
  value
    .replace(/[’']/g, "'")
    .replace(/(\w)\s*-\s+(\w)/g, "$1$2")
    .replace(/\s+/g, "");

const sources: Partial<Record<CrqVariant, string>> = {};

beforeAll(async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  for (const [variant, file] of Object.entries(PDFS)) {
    const data = new Uint8Array(fs.readFileSync(path.join(process.cwd(), "public", file)));
    const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
    let raw = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      raw += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
    }
    sources[variant as CrqVariant] = squash(raw);
  }
});

describe.each(Object.keys(PDFS) as Exclude<CrqVariant, "individual">[])("%s edition wording", (variant) => {
  const form = CRQ_FORMS[variant];
  const expectInSource = (text: string) => expect(sources[variant]).toContain(squash(text));

  it("has the header, intro and lead-in questions", () => {
    expectInSource(form.subtitle);
    expectInSource(form.primaryNameLabel);
    if (form.jointNameLabel) expectInSource(form.jointNameLabel);
    for (const p of form.introParagraphs) expectInSource(p);
    expectInSource(form.priorityQuestion);
    expectInSource(form.investmentCheckQuestion.question);
  });

  it("has every question and answer, with its printed points", () => {
    for (const q of form.questions) {
      expectInSource(`${q.number}. ${q.question.replace("\n", " ")}`);
      for (const o of q.options) expectInSource(`${o.label} ${o.pointsLabel}`);
    }
  });

  it("has the profile headings, acknowledgement and signature labels", () => {
    expectInSource(form.profileHeading);
    expectInSource(form.levelsLabel);
    expectInSource(form.rankingLabel);
    expectInSource(form.levelsInstruction);
    expectInSource(form.rankingInstruction);
    expectInSource(form.acknowledgement.all);
    expectInSource(form.acknowledgement.singlePrefix);
    expectInSource(form.acknowledgement.singleSuffix);
    if (form.acknowledgement.goalTail) {
      expectInSource(`(${form.acknowledgement.goalChoices!.join("/")}) ${form.acknowledgement.goalTail}`);
    }
    expectInSource(form.primarySignatureLabel);
    if (form.jointSignatureLabel) expectInSource(form.jointSignatureLabel);
    if (form.signingNote) expectInSource(form.signingNote);
  });
});

describe("scoring by edition", () => {
  const allFirst = (variant: CrqVariant) =>
    Object.fromEntries(CRQ_FORMS[variant].questions.map((q) => [q.id, `${q.id}_a`]));

  it("scores the corporate Question 1 on its own scale", () => {
    // Option a is "Under 35" (10 pts) on the individual form, "Start-up to < 3 years" (6 pts) on the corporate one.
    const individual = deriveRiskProfile(allFirst("individual"), CRQ_FORMS.individual);
    const corporate = deriveRiskProfile(allFirst("corporate"), CRQ_FORMS.corporate);
    expect(individual.capacity.score! - corporate.capacity.score!).toBe(4);
    expect(individual.tolerance.score).toBe(corporate.tolerance.score);
  });

  it("scores the joint edition exactly as the individual one", () => {
    expect(deriveRiskProfile(allFirst("joint"), CRQ_FORMS.joint)).toEqual(
      deriveRiskProfile(allFirst("individual"), CRQ_FORMS.individual),
    );
  });
});

describe("joint validation and submission", () => {
  const completeJoint = (): QuestionnaireState => ({
    ...blankQuestionnaire(),
    accountHolderName: "Alex Sample",
    jointHolderName: "Sam Sample",
    answers: Object.fromEntries(CRQ_FORMS.joint.questions.map((q) => [q.id, q.options[0].id])),
    acknowledgementType: "single_account",
    acknowledgementAccountName: "Joint TFSA",
    acknowledgementGoal: "Growth",
    accountHolderSignature: "data:image/png;base64,AAAA",
    accountHolderDate: "2026-09-25",
    jointHolderSignature: "data:image/png;base64,BBBB",
    jointHolderDate: "2026-09-25",
  });

  it("accepts a complete joint questionnaire and submits both holders", () => {
    const state = completeJoint();
    expect(validateQuestionnaire(state, CRQ_FORMS.joint)).toEqual([]);
    expect(buildSubmission(state, CRQ_FORMS.joint)).toMatchObject({
      variant: "joint",
      jointHolderName: "Sam Sample",
      jointHolderSignature: "data:image/png;base64,BBBB",
      acknowledgement: { type: "single_account", accountName: "Joint TFSA", goal: "Growth" },
    });
  });

  it("requires the joint holder's name, signature, date and the account's goal", () => {
    const state = {
      ...completeJoint(),
      jointHolderName: "",
      jointHolderSignature: null,
      jointHolderDate: "",
      acknowledgementGoal: null,
    };
    const ids = validateQuestionnaire(state, CRQ_FORMS.joint).map((e) => e.fieldId);
    expect(ids).toEqual([
      fieldIds.jointHolderName,
      fieldIds.acknowledgementGoal,
      fieldIds.jointHolderSignature,
      fieldIds.jointHolderDate,
    ]);
  });

  it("does not ask an individual questionnaire for a joint holder", () => {
    const state = { ...completeJoint(), jointHolderName: "", jointHolderSignature: null, jointHolderDate: "" };
    expect(validateQuestionnaire(state, CRQ_FORMS.individual)).toEqual([]);
    expect(buildSubmission(state, CRQ_FORMS.individual)?.jointHolderName).toBeNull();
  });

  it("asks the corporate edition for the Authorized Signing Officer", () => {
    const state = { ...completeJoint(), accountHolderSignature: null };
    const [error] = validateQuestionnaire(state, CRQ_FORMS.corporate);
    expect(error.message).toContain("Authorized Signing Officer");
  });
});
