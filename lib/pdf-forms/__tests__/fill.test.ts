/**
 * Round-trip tests for the official-PDF fillers: fill a synthetic form, reload
 * the result with pdf-lib and read back text values and which widget of each
 * multi-widget checkbox is ON.
 *
 * The on-values asserted here are the ones established by position (see the
 * header of ../naaf.ts); the visual check of the rendered output is what ties
 * them to the printed labels. Set PDF_FORMS_OUT=<dir> to also write the filled
 * PDFs there for rendering.
 */

import fs from "node:fs";
import path from "node:path";

import { PDFCheckBox, PDFDocument, PDFName, PDFRawStream, PDFTextField } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { blankNaaf } from "../../naaf/blank";
import { blankQuestionnaire } from "../../risk-questionnaire/blank";
import { CRQ_FORMS } from "../../risk-questionnaire/forms";
import { deriveRiskProfile } from "../../risk-questionnaire/scoring";
import type { CrqVariant } from "../../risk-questionnaire/types";
import { CRQ_TEMPLATES, NAAF_TEMPLATE, fillCrqPdf, fillNaafPdf } from "..";
import { syntheticCrq, syntheticNaaf } from "./fixtures";

const PUBLIC = path.join(__dirname, "..", "..", "..", "public");
const template = (file: string) => new Uint8Array(fs.readFileSync(path.join(PUBLIC, file)));
const OUT = process.env.PDF_FORMS_OUT;
const save = (name: string, bytes: Uint8Array) => {
  if (OUT) fs.writeFileSync(path.join(OUT, name), bytes);
};

/** On-values of the widgets of `name` whose appearance state is ON. */
function onWidgets(doc: PDFDocument, name: string): string[] {
  const field = doc.getForm().getField(name);
  expect(field).toBeInstanceOf(PDFCheckBox);
  return field.acroField
    .getWidgets()
    .map((w) => w.getAppearanceState()?.decodeText())
    .filter((v): v is string => v !== undefined && v !== "Off");
}

const fieldValue = (doc: PDFDocument, name: string): string | undefined => {
  const v = doc.getForm().getField(name).acroField.dict.get(PDFName.of("V"));
  return v instanceof PDFName ? v.decodeText() : undefined;
};

const textOf = (doc: PDFDocument, name: string) => doc.getForm().getTextField(name).getText();

/** Every field holding a value or a tick. */
function filledNames(doc: PDFDocument): Set<string> {
  const names = new Set<string>();
  for (const f of doc.getForm().getFields()) {
    if (f instanceof PDFTextField && f.getText()) names.add(f.getName());
    if (f instanceof PDFCheckBox && f.acroField.getWidgets().some((w) => w.getAppearanceState()?.decodeText() !== "Off"))
      names.add(f.getName());
  }
  return names;
}

/** Image XObjects, not counting the soft masks that carry PNG transparency. */
const rawImageCount = (doc: PDFDocument): number => {
  const images: string[] = [];
  const masks = new Set<string>();
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || obj.dict.get(PDFName.of("Subtype"))?.toString() !== "/Image") continue;
    images.push(ref.toString());
    const mask = obj.dict.get(PDFName.of("SMask"));
    if (mask) masks.add(mask.toString());
  }
  return images.filter((r) => !masks.has(r)).length;
};

/** Image XObjects the filler added (the templates carry their own logos and charts). */
async function addedImages(doc: PDFDocument, templateFile: string): Promise<number> {
  return rawImageCount(doc) - rawImageCount(await PDFDocument.load(template(templateFile)));
}

// ---------------------------------------------------------------- NAAF

describe("fillNaafPdf", () => {
  let doc: PDFDocument;
  let bytes: Uint8Array;

  beforeAll(async () => {
    bytes = await fillNaafPdf(template(NAAF_TEMPLATE), syntheticNaaf());
    save("naaf-filled.pdf", bytes);
    doc = await PDFDocument.load(bytes);
  });

  it("writes header, Section A and B text", () => {
    expect(textOf(doc, "CCode")).toBe("TEST-0042");
    expect(textOf(doc, "txtLastName")).toBe("Testperson");
    expect(textOf(doc, "txtFirstName")).toMatch(/^Alexa +Q$/);
    expect(textOf(doc, "txtAddress")).toMatch(/^123 Example Street +Apt\. 4B$/);
    expect(textOf(doc, "txtEmail")).toBe("alexa@example.com");
    expect(textOf(doc, "citizenship")).toBe("Freedonia");
    expect(textOf(doc, "11Joint_Surname")).toBe("Jointperson");
    expect(textOf(doc, "zrelateother")).toBe("Sibling");
    expect(textOf(doc, "11JointClientID1")).toBe("D0000002");
    expect(textOf(doc, "zzspouse_income")).toBe("45000");
  });

  it("ticks the right widget of multi-widget groups", () => {
    expect(onWidgets(doc, "chknewzz1")).toEqual(["Yes"]); // KYC Update
    expect(onWidgets(doc, "chknewzz0")).toEqual([]);
    expect(onWidgets(doc, "nTitle")).toEqual(["4"]); // Dr.
    expect(fieldValue(doc, "nTitle")).toBe("4");
    expect(onWidgets(doc, "11JointTitle")).toEqual(["3"]); // Ms.
    expect(onWidgets(doc, "nSex")).toEqual(["1"]); // Female
    expect(onWidgets(doc, "11JointSex")).toEqual(["0"]); // Male
    expect(onWidgets(doc, "nMaritalStatus")).toEqual(["6"]); // Separated
    expect(onWidgets(doc, "11jt_marital_status_wid")).toEqual(["Yes"]); // Widowed
    expect(onWidgets(doc, "nIncome")).toEqual(["4"]); // $100,000 - $124,999
    expect(onWidgets(doc, "11JointPersonalIncome")).toEqual(["1"]); // $25,000 - $49,999
    expect(onWidgets(doc, "nKnowledge")).toEqual(["1"]); // Good
    expect(onWidgets(doc, "11JointInvestmentKnowledge")).toEqual(["3"]); // Novice
    expect(onWidgets(doc, "1PTypeExtended")).toEqual(["302"]); // SpRRIF
    expect(onWidgets(doc, "2PTypeExtended")).toEqual([]); // plan 2 is "Other"
    expect(onWidgets(doc, "zzzoth_b")).toEqual(["Yes"]);
    expect(onWidgets(doc, "3Joint_Flag")).toEqual(["1"]); // Open JTTIC
    expect(onWidgets(doc, "1PLiquidity")).toEqual(["2"]); // 3 - 5 Years current
    expect(onWidgets(doc, "zli5")).toEqual(["Yes"]); // 10 - 20 Years new
    expect(onWidgets(doc, "2PLiquidity")).toEqual(["0"]); // Less than 1 Year
    expect(onWidgets(doc, "zli6_b")).toEqual(["Yes"]); // Over 20 Years
    expect(onWidgets(doc, "1Account_Designation")).toEqual(["1"]); // Keybase Nominee
    expect(onWidgets(doc, "1nLeverage")).toEqual(["1"]); // Yes
    expect(onWidgets(doc, "1nQ1")).toEqual(["1"]); // Plan 1 financial interest: YES
    expect(onWidgets(doc, "2nQ2")).toEqual(["1"]); // Plan 2 trading authorization: YES
    expect(onWidgets(doc, "z3nQ2")).toEqual(["1"]); // Plan 3 making deposits: YES
    expect(onWidgets(doc, "Charity_Flag2")).toEqual(["2"]); // registered charity: YES
    expect(onWidgets(doc, "Charity_Flag1")).toEqual(["1"]); // not-for-profit: No
    expect(onWidgets(doc, "txtBankAccountType")).toEqual(["1"]); // Savings
    expect(onWidgets(doc, "IdMethodInPerson")).toEqual(["1"]); // met in person: Yes
    expect(onWidgets(doc, "zchkMqustionsb111")).toEqual(["Yes"]); // verified ID: No
  });

  it("writes Section C amounts and the computed net worth", () => {
    expect(textOf(doc, "txtLiquidAsset")).toBe("250000");
    expect(textOf(doc, "txtAsset")).toBe("600000");
    expect(textOf(doc, "txtLiability")).toBe("150000");
    expect(textOf(doc, "txtTotalAsset")).toBe("700000");
    expect(textOf(doc, "11JointNetAssets")).toBe("7500");
    for (const f of ["nBond", "nStock", "nRealEstate", "oiv7_jt", "SpousalNetWorthIncluded"]) {
      expect(onWidgets(doc, f).length, f).toBe(1);
    }
    expect(onWidgets(doc, "nMortgage")).toEqual([]);
  });

  it("puts current and new allocations in their own columns", () => {
    expect(textOf(doc, "1PInvestObject_Growth_Per")).toBe("40");
    expect(textOf(doc, "1zoi_gro_pec")).toBe("35");
    expect(textOf(doc, "1PRiskTolerence_MH_Per")).toBe("34");
    expect(textOf(doc, "zper_h")).toBe("90");
    expect(textOf(doc, "2PInvestObject_Balanced_Per")).toBe("100");
    expect(textOf(doc, "2zper_m")).toBe("100");
    expect(textOf(doc, "3zoi_gro_pec")).toBe("100");
    expect(textOf(doc, "3PRiskTolerence_LM_Per")).toBe("100");
  });

  it("writes G–N text, dates and draws three signatures", async () => {
    expect(textOf(doc, "2Intermediary_Account_Code")).toBe("Broker X #998877");
    expect(textOf(doc, "zzztxtother_b")).toBe("Custom");
    expect(textOf(doc, "1TrustedContactPersonEmail")).toBe("jordan@example.com");
    expect(textOf(doc, "sigClient1_1")).toBe("AQT");
    expect(textOf(doc, "sigClientDate2_2")).toBe("2026-09-21");
    expect(textOf(doc, "txtRepNameFL")).toBe("Morgan Advisorperson");
    expect(textOf(doc, "sigClient1_2")).toBeUndefined(); // image, not text
    expect(await addedImages(doc, NAAF_TEMPLATE)).toBe(3);
  });

  it("leaves Section B blank when there is no joint holder", async () => {
    const single = syntheticNaaf();
    single.hasJointHolder = false;
    const d = await PDFDocument.load(await fillNaafPdf(template(NAAF_TEMPLATE), single));
    const filled = filledNames(d);
    expect(filled.has("txtLastName")).toBe(true);
    expect([...filled].filter((n) => n.startsWith("11"))).toEqual([]);
    expect(filled.has("zchkid_b.2")).toBe(false);
  });

  it("a blank form fills nothing", async () => {
    const d = await PDFDocument.load(await fillNaafPdf(template(NAAF_TEMPLATE), blankNaaf()));
    expect([...filledNames(d)]).toEqual([]);
  });

  it("options override the state's signatures and dates", async () => {
    const d = await PDFDocument.load(
      await fillNaafPdf(template(NAAF_TEMPLATE), syntheticNaaf(), {
        signatures: { client2: null, advisor: null },
        dates: { client1: "2027-01-01" },
      }),
    );
    expect(textOf(d, "sigClientDate1_2")).toBe("2027-01-01");
    expect(await addedImages(d, NAAF_TEMPLATE)).toBe(1);
  });

  it("flatten: true leaves no form fields and keeps the signatures", async () => {
    const flat = await fillNaafPdf(template(NAAF_TEMPLATE), syntheticNaaf(), { flatten: true });
    save("naaf-flat.pdf", flat);
    const d = await PDFDocument.load(flat);
    expect(d.getForm().getFields()).toHaveLength(0);
    expect(await addedImages(d, NAAF_TEMPLATE)).toBe(3);
  });
});

// ---------------------------------------------------------------- CRQ

describe.each<CrqVariant>(["individual", "joint", "corporate"])("fillCrqPdf (%s)", (variant) => {
  let doc: PDFDocument;
  const state = syntheticCrq();
  const profile = deriveRiskProfile(state.answers, CRQ_FORMS[variant]);

  beforeAll(async () => {
    const bytes = await fillCrqPdf(template(CRQ_TEMPLATES[variant]), state, variant);
    save(`crq-${variant}-filled.pdf`, bytes);
    doc = await PDFDocument.load(bytes);
  });

  it("writes names, client id and priority ranks", () => {
    expect(textOf(doc, "txtNameFL")).toBe("Alexa Testperson");
    expect(textOf(doc, "CCode")).toBe("TEST-0042");
    expect(textOf(doc, "1a")).toBe("3");
    expect(textOf(doc, "1b")).toBeUndefined();
    expect(textOf(doc, "1c")).toBe("1");
    expect(onWidgets(doc, "19a")).toEqual(["3"]); // Quarterly
    if (variant === "joint") expect(textOf(doc, "11txtJointName")).toBe("Sam Jointperson");
  });

  it("ticks each answer and fills its score box", () => {
    expect(onWidgets(doc, "3a")).toEqual(["2"]); // Q1 b
    expect(onWidgets(doc, "4a")).toEqual(["4"]); // Q2 d
    expect(onWidgets(doc, "5a")).toEqual(["7"]); // Q3 g
    expect(onWidgets(doc, "7a")).toEqual(["6"]); // Q5 f
    expect(onWidgets(doc, "16a")).toEqual(["3"]); // Q10 c
    expect(onWidgets(doc, "17a")).toEqual(["3"]); // Q12 c
    expect(textOf(doc, "score3")).toBe(variant === "corporate" ? "7" : "8"); // corporate Q1 scores differently
    expect(textOf(doc, "score5")).toBe("9");
    expect(textOf(doc, "score17")).toBe("6"); // Q12
    expect(textOf(doc, "score18")).toBe("6"); // Q11
  });

  it("writes totals, band boxes and the ranking from deriveRiskProfile", () => {
    expect(textOf(doc, "Total1")).toBe(String(profile.capacity.score));
    expect(textOf(doc, "Total2")).toBe("32");
    expect(textOf(doc, "RCS5")).toBe(String(profile.capacity.score)); // High
    expect(textOf(doc, "RtS3")).toBe("32"); // Medium
    for (const f of ["RCS1", "RCS2", "RCS3", "RCS4", "RtS1", "RtS2", "RtS4", "RtS5"]) {
      expect(textOf(doc, f), f).toBeUndefined();
    }
    expect(onWidgets(doc, "RR1")).toEqual(["3"]); // Medium
  });

  it("writes notes, acknowledgement, advisor and signatures", async () => {
    const notes = `${textOf(doc, "Notesl1")} ${textOf(doc, "Notesl2")}`;
    expect(notes).toBe(state.notes);
    if (variant === "joint") {
      expect(onWidgets(doc, "98a")).toEqual(["2"]);
      expect(onWidgets(doc, "99a")).toEqual([]);
    } else {
      expect(onWidgets(doc, "undefined.99")).toEqual(["2"]);
    }
    expect(textOf(doc, "Plan _ID")).toBe("TFSA 1234");
    expect(textOf(doc, "txtRepNameFL")).toBe("Morgan Advisorperson");
    expect(textOf(doc, "sigAdvisorDate1_1")).toBe("2026-09-25");
    expect(await addedImages(doc, CRQ_TEMPLATES[variant])).toBe(variant === "joint" ? 3 : 2);
  });

  it("an incomplete section prints no total, level or ranking", async () => {
    const partial = { ...syntheticCrq(), answers: { ...state.answers, q12: undefined } };
    const d = await PDFDocument.load(await fillCrqPdf(template(CRQ_TEMPLATES[variant]), partial, variant));
    expect(textOf(d, "Total2")).toBeUndefined();
    expect(textOf(d, "score17")).toBeUndefined();
    expect(textOf(d, "RtS3")).toBeUndefined();
    expect(onWidgets(d, "RR1")).toEqual([]);
    expect(textOf(d, "Total1")).toBe(String(profile.capacity.score));
  });

  it("a blank questionnaire fills nothing; flatten removes every field", async () => {
    const blank = await PDFDocument.load(
      await fillCrqPdf(template(CRQ_TEMPLATES[variant]), blankQuestionnaire(), variant),
    );
    expect([...filledNames(blank)]).toEqual([]);
    const flat = await PDFDocument.load(
      await fillCrqPdf(template(CRQ_TEMPLATES[variant]), state, variant, { flatten: true }),
    );
    expect(flat.getForm().getFields()).toHaveLength(0);
    expect(await addedImages(flat, CRQ_TEMPLATES[variant])).toBe(variant === "joint" ? 3 : 2);
  });
});
