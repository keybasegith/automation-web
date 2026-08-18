/**
 * Cleaning of OCR output.
 *
 * The noise in every input below is the noise Tesseract actually returned from
 * crops of a flattened submission — what a widget rectangle catches when it runs
 * slightly wider than the ink it holds. The names are placeholders.
 */

import { describe, expect, it } from "vitest";
import { cleanOcrText } from "../ocrTemplate";

describe("cleanOcrText", () => {
  it("leaves a clean value alone", () => {
    expect(cleanOcrText("Whitfield", "text")).toBe("Whitfield");
    expect(cleanOcrText("Hamilton", "text")).toBe("Hamilton");
  });

  it("collapses the whitespace an OCR pass introduces", () => {
    expect(cleanOcrText("  Grace   Palmer \n", "text")).toBe("Grace Palmer");
  });

  it("drops a rule line caught at the edge of a code box", () => {
    expect(cleanOcrText("9744 |", "code")).toBe("9744");
  });

  it("drops the printed label the crop ran into", () => {
    expect(cleanOcrText("Grace Palmer Sig;", "text")).toBe("Grace Palmer");
    expect(cleanOcrText("Grace Palmer Signature", "text")).toBe("Grace Palmer");
  });

  it("drops a stray lowercase mark trailing a name", () => {
    expect(cleanOcrText("MARTIN i", "text")).toBe("MARTIN");
  });

  it("keeps a capitalised initial, which is a real answer on these forms", () => {
    expect(cleanOcrText("Rosalind M", "text")).toBe("Rosalind M");
  });

  it("keeps a label word that is part of the value itself", () => {
    // Only the LAST token is ever peeled, so an interior match survives.
    expect(cleanOcrText("Date Palmer Holdings", "text")).toBe("Date Palmer Holdings");
  });

  it("keeps digits and separators for a number box", () => {
    expect(cleanOcrText("1483000", "number")).toBe("1483000");
    expect(cleanOcrText("$1,483,000 .", "number")).toBe("1483000.");
  });

  it("strips punctuation noise from a code box without losing the code", () => {
    expect(cleanOcrText("7072", "code")).toBe("7072");
    expect(cleanOcrText("C-10045", "code")).toBe("C-10045");
  });

  it("returns empty for an empty or whitespace-only crop", () => {
    expect(cleanOcrText("", "text")).toBe("");
    expect(cleanOcrText("   \n ", "text")).toBe("");
  });
});
