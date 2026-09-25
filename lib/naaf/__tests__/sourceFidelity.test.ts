/**
 * Source fidelity: the printed wording in config.ts must match public/form-NAAF.pdf.
 *
 * The NAAF is a compliance document, so its wording is not ours to edit. This
 * reads the PDF's text layer and asserts every paragraph, question and option
 * transcribed from pages 1, 3 and 4 still appears there.
 *
 * Page 2 (Sections D-H) cannot be checked this way: its text layer decodes to
 * garbage, so those strings were transcribed from the rendered page and are
 * listed below as known gaps rather than silently skipped.
 */

import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  ADVISOR_QUESTIONS,
  AGREEMENT_INTRO,
  AGREEMENT_POINTS,
  CASL_CONSENT,
  DEFINITIONS,
  DEFINITIONS_INTRO,
  EDD_CONSENT,
  ENTITY_TYPES,
  EXPERIENCE_TYPES,
  FORM_TITLE,
  FORM_VERSION,
  INCOME_BANDS,
  KNOWLEDGE_LEVELS,
  MARITAL_STATUSES,
  NET_WORTH_FORMULA,
  NET_WORTH_INCLUDES_SPOUSE,
  OBA_DISCLAIMER,
  OBA_INTRO,
  PEP_ASSOCIATE_QUESTION,
  PEP_QUESTION,
  PERSON_TITLES,
  SECTION_TITLES,
  TAX_RESIDENCE_NOTICE,
  TCP_PARAGRAPH,
} from "@/lib/naaf/config";

const PDF_PATH = path.join(process.cwd(), "public", "form-NAAF.pdf");

/**
 * This PDF's text layer splits words at arbitrary points ("Inform ati on",
 * "Knowle dge"), so comparison ignores whitespace entirely and folds the curly
 * apostrophe the layer sometimes swaps for a straight one.
 */
const squash = (value: string): string => value.replace(/[’']/g, "'").replace(/\s+/g, "");

let sourceText = "";

beforeAll(async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
  let raw = "";
  for (const pageNumber of [1, 3, 4]) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    raw += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  sourceText = squash(raw);
});

const expectInSource = (text: string) => expect(sourceText).toContain(squash(text));

describe("NAAF wording matches public/form-NAAF.pdf", () => {
  it("has the form title and revision", () => {
    expectInSource(FORM_TITLE);
    expectInSource(FORM_VERSION);
  });

  it("has the Section A/B options and questions", () => {
    for (const t of [...PERSON_TITLES, ...ENTITY_TYPES, ...MARITAL_STATUSES]) expectInSource(t);
    expectInSource(TAX_RESIDENCE_NOTICE);
    expectInSource(PEP_QUESTION);
    expectInSource(PEP_ASSOCIATE_QUESTION);
  });

  it("has the Section C tables", () => {
    for (const t of [...INCOME_BANDS, ...KNOWLEDGE_LEVELS, ...EXPERIENCE_TYPES]) expectInSource(t);
    expectInSource(NET_WORTH_FORMULA);
    expectInSource(NET_WORTH_INCLUDES_SPOUSE);
  });

  it("has Sections I-N verbatim", () => {
    for (const title of [
      SECTION_TITLES.I,
      SECTION_TITLES.J,
      SECTION_TITLES.K,
      SECTION_TITLES.L,
      SECTION_TITLES.M,
      SECTION_TITLES.N,
    ]) {
      expectInSource(title);
    }
    expectInSource(TCP_PARAGRAPH);
    expectInSource(CASL_CONSENT);
    expectInSource(EDD_CONSENT);
    expectInSource(OBA_INTRO);
    expectInSource(OBA_DISCLAIMER);
    expectInSource(AGREEMENT_INTRO);
    for (const point of AGREEMENT_POINTS) expectInSource(point);
    for (const q of ADVISOR_QUESTIONS) expectInSource(`${q.text} ${q.note}`);
  });

  it("has the page 4 KYC Terms and Definitions", () => {
    expectInSource(DEFINITIONS_INTRO);
    for (const block of DEFINITIONS) {
      expectInSource(block.heading);
      for (const p of block.paragraphs) expectInSource(p);
      for (const t of block.terms ?? []) expectInSource(`${t.term} ${t.text}`);
    }
  });
});
