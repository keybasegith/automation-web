/**
 * Source fidelity: the config must say exactly what the PDF says.
 *
 * The Client Risk Questionnaire is a compliance document, so its wording and
 * point values are not ours to edit. This test reads the text layer of
 * public/crq-individualaccountholder.pdf and asserts that every question,
 * every answer option, every printed point value and the acknowledgement copy
 * still appear there verbatim. Reword anything in config.ts and this fails.
 *
 * It intentionally checks against the shipped PDF rather than a snapshot: if
 * Keybase issues a new form, the PDF and the config change together.
 */

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, beforeAll } from "vitest";

import {
  ACKNOWLEDGEMENT_ALL_ACCOUNTS,
  ACKNOWLEDGEMENT_SINGLE_ACCOUNT_PREFIX,
  ACKNOWLEDGEMENT_SINGLE_ACCOUNT_SUFFIX,
  CAPACITY_SUMMARY_INSTRUCTION,
  FORM_VERSION,
  INTRO_PARAGRAPHS,
  INVESTMENT_CHECK_QUESTION,
  PORTFOLIO_PRIORITIES,
  PORTFOLIO_PRIORITY_INSTRUCTION,
  PORTFOLIO_PRIORITY_QUESTION,
  RISK_LEVEL_BANDS,
  RISK_LEVELS_INSTRUCTION,
  RISK_QUESTIONS,
  RISK_RANKING_INSTRUCTION,
  TOLERANCE_SUMMARY_INSTRUCTION,
} from "@/lib/risk-questionnaire/config";

const PDF_PATH = path.join(process.cwd(), "public", "crq-individualaccountholder.pdf");

/**
 * Collapses the differences between a PDF text layer and prose: curly quotes,
 * the line wrapping the layer preserves, and the stray space the source sets
 * inside "f )".
 */
const normalise = (value: string): string =>
  value
    .replace(/’/g, "'")
    .replace(/f\s\)/g, "f)")
    .replace(/\s+/g, " ")
    .trim();

let sourceText = "";

beforeAll(async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  // Only the text layer is needed here, so silence pdf.js's warning about the
  // standard font data it would want in order to render glyphs.
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;

  let raw = "";
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const content = await (await doc.getPage(pageNumber)).getTextContent();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      // A line end needs a space, or the layer welds the last word of one line
      // to the first of the next.
      raw += item.str + (item.hasEOL ? " " : "");
    }
  }
  sourceText = normalise(raw);
}, 30_000);

const expectInSource = (value: string) => {
  for (const line of value.split("\n")) {
    expect(sourceText, `not found in the source PDF: "${line.slice(0, 80)}"`).toContain(
      normalise(line),
    );
  }
};

describe("questions and answers are transcribed from the source PDF", () => {
  it.each(RISK_QUESTIONS.map((q) => [q.number, q] as const))(
    "question %i is worded as printed",
    (_number, question) => {
      expectInSource(question.question);
      expectInSource(question.instruction);
    },
  );

  it.each(
    RISK_QUESTIONS.flatMap((q) =>
      q.options.map((o) => [`${q.id}${o.letter}`, `${o.letter}) ${o.label} ${o.pointsLabel}`] as const),
    ),
  )("%s prints its label and point value as printed", (_id, printed) => {
    // Label and points are checked together, so a point value cannot drift
    // away from the answer it belongs to.
    expectInSource(printed);
  });

  it("covers all 57 answer options across the twelve scored questions", () => {
    expect(RISK_QUESTIONS).toHaveLength(12);
    expect(RISK_QUESTIONS.flatMap((q) => q.options)).toHaveLength(57);
  });
});

describe("the unscored lead-in questions are transcribed too", () => {
  it("keeps the portfolio priority wording", () => {
    expectInSource(PORTFOLIO_PRIORITY_QUESTION);
    expectInSource(PORTFOLIO_PRIORITY_INSTRUCTION);
    for (const priority of PORTFOLIO_PRIORITIES) {
      expectInSource(`${priority.letter}) ${priority.label}`);
    }
  });

  it("keeps the investment check frequency wording", () => {
    expectInSource(INVESTMENT_CHECK_QUESTION.question);
    for (const option of INVESTMENT_CHECK_QUESTION.options) {
      expectInSource(`${option.letter}) ${option.label}`);
    }
  });

  it("attaches no point value to either of them", () => {
    // These are plain option shapes with no `points` field at all, so there is
    // nothing for the scorer to pick up even by accident.
    for (const option of INVESTMENT_CHECK_QUESTION.options) {
      expect(option).not.toHaveProperty("points");
    }
    for (const priority of PORTFOLIO_PRIORITIES) {
      expect(priority).not.toHaveProperty("points");
    }
  });
});

describe("surrounding form copy is transcribed", () => {
  it("keeps the three intro paragraphs", () => {
    for (const paragraph of INTRO_PARAGRAPHS) expectInSource(paragraph);
  });

  it("keeps the scoring and risk-profile instructions", () => {
    expectInSource(CAPACITY_SUMMARY_INSTRUCTION);
    expectInSource(TOLERANCE_SUMMARY_INSTRUCTION);
    expectInSource(RISK_LEVELS_INSTRUCTION);
    expectInSource(RISK_RANKING_INSTRUCTION);
  });

  it("keeps both client acknowledgements", () => {
    expectInSource(ACKNOWLEDGEMENT_ALL_ACCOUNTS);
    expectInSource(ACKNOWLEDGEMENT_SINGLE_ACCOUNT_PREFIX);
    expectInSource(ACKNOWLEDGEMENT_SINGLE_ACCOUNT_SUFFIX);
  });

  it("keeps the printed threshold ranges and the form version", () => {
    for (const band of RISK_LEVEL_BANDS) expectInSource(band.display);
    expectInSource(FORM_VERSION);
  });
});
