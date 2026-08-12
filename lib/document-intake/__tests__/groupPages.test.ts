import { describe, expect, it } from "vitest";
import { groupPages } from "../groupPages";
import type { PageIndicator } from "../pageIndicator";
import { UNSURE_DOCUMENT_NAME, type PageClassification } from "../types";

const AIO = {
  documentName: "Order / PAC Request AIO 1st Plan - 10099",
  documentCode: "10099",
  category: "Keybase Trading",
} as const;

const KYC3 = {
  documentName: "KYC Update - 3 Pages - 10001",
  documentCode: "10001",
  category: "Keybase Know Your Client KYC",
} as const;

const ARGS = { clientName: "Jane Smith" };

/** A page the classifier confidently matched to a catalog form. */
function anchor(
  pageNumber: number,
  doc: { documentName: string; documentCode: string; category: string },
  pageIndicator?: PageIndicator
): PageClassification {
  return {
    pageNumber,
    documentType: "Other",
    documentName: doc.documentName,
    documentCode: doc.documentCode,
    category: doc.category,
    confidence: 98,
    reason: "form code found in page header/footer",
    matchedKeywords: [doc.documentCode],
    extractedTextPreview: "",
    needsReview: false,
    source: "keyword",
    pageIndicator,
  };
}

/** A page that matched the form on keywords alone — below the anchor bar. */
function weak(
  pageNumber: number,
  doc: { documentName: string; documentCode: string; category: string }
): PageClassification {
  return {
    ...anchor(pageNumber, doc),
    confidence: 72,
    reason: "weak match — keywords only",
    needsReview: true,
    source: "fallback",
  };
}

/** A page carrying no form code — the back of a recto-verso sheet. */
function unsure(
  pageNumber: number,
  pageIndicator?: PageIndicator
): PageClassification {
  return {
    pageNumber,
    documentType: "Other",
    documentName: UNSURE_DOCUMENT_NAME,
    category: "Unknown",
    confidence: 25,
    reason: "no catalog matches found",
    matchedKeywords: [],
    extractedTextPreview: "",
    needsReview: true,
    source: "fallback",
    pageIndicator,
  };
}

const shape = (groups: ReturnType<typeof groupPages>) =>
  groups.map((g) => ({
    documentName: g.documentName,
    pages: g.pageNumbers,
  }));

describe("groupPages — catalog page counts", () => {
  it("splits back-to-back recto-verso AIO orders into one document per sheet", () => {
    // Only the front of each sheet prints the form code. Without the 2-page
    // cap all four pages would collapse into a single document.
    const groups = groupPages(
      [anchor(1, AIO), unsure(2), anchor(3, AIO), unsure(4)],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: AIO.documentName, pages: [1, 2] },
      { documentName: AIO.documentName, pages: [3, 4] },
    ]);
  });

  it("claims the unnamed back page as part of the anchor's document", () => {
    const groups = groupPages([anchor(1, AIO), unsure(2)], ARGS);

    expect(groups).toHaveLength(1);
    expect(groups[0].pageNumbers).toEqual([1, 2]);
    expect(groups[0].documentName).toBe(AIO.documentName);
  });

  it("flushes unidentified overflow past the expected count as Unsure", () => {
    // Page 3 only matched on weak keywords — it must not silently inflate the
    // two-page order above it.
    const groups = groupPages(
      [anchor(1, AIO), unsure(2), weak(3, AIO)],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: AIO.documentName, pages: [1, 2] },
      { documentName: UNSURE_DOCUMENT_NAME, pages: [3] },
    ]);
  });

  it("opens a new document when the overflow page prints its own form code", () => {
    // Three AIO fronts in a row are three orders, not one oversized document
    // plus an anomaly.
    const groups = groupPages(
      [anchor(1, AIO), anchor(2, AIO), anchor(3, AIO)],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: AIO.documentName, pages: [1, 2] },
      { documentName: AIO.documentName, pages: [3] },
    ]);
  });
});

describe("groupPages — page stamps", () => {
  it("holds a 3-page form together from its stamps alone", () => {
    const groups = groupPages(
      [
        anchor(1, KYC3, { index: 1, total: 3 }),
        unsure(2, { index: 2, total: 3 }),
        unsure(3, { index: 3, total: 3 }),
      ],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: KYC3.documentName, pages: [1, 2, 3] },
    ]);
  });

  it("starts a new document at every 'Page 1 of N'", () => {
    // Two KYC Updates filed back to back. Every page classifies identically —
    // only the restarting stamp says where one ends and the next begins.
    const groups = groupPages(
      [
        anchor(1, KYC3, { index: 1, total: 3 }),
        unsure(2, { index: 2, total: 3 }),
        unsure(3, { index: 3, total: 3 }),
        anchor(4, KYC3, { index: 1, total: 3 }),
        unsure(5, { index: 2, total: 3 }),
        unsure(6, { index: 3, total: 3 }),
      ],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: KYC3.documentName, pages: [1, 2, 3] },
      { documentName: KYC3.documentName, pages: [4, 5, 6] },
    ]);
  });

  it("names the document correctly when only a later page carries the code", () => {
    // The anchor is on page 2, stamped "2 of 3". Backward expansion has to
    // claim page 1 — a group takes its name from its first page, so without
    // it the whole document would be filed as Unsure.
    const groups = groupPages(
      [
        unsure(1, { index: 1, total: 3 }),
        anchor(2, KYC3, { index: 2, total: 3 }),
        unsure(3, { index: 3, total: 3 }),
      ],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: KYC3.documentName, pages: [1, 2, 3] },
    ]);
  });

  it("lets a stamp override the catalog's page count", () => {
    // The catalog entry says 3 pages, but this instance stamps "of 2". The
    // printed stamp is per-instance truth and wins.
    const groups = groupPages(
      [
        anchor(1, KYC3, { index: 1, total: 2 }),
        unsure(2, { index: 2, total: 2 }),
        anchor(3, KYC3, { index: 1, total: 2 }),
        unsure(4, { index: 2, total: 2 }),
      ],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: KYC3.documentName, pages: [1, 2] },
      { documentName: KYC3.documentName, pages: [3, 4] },
    ]);
  });

  it("separates a mixed package into one group per document", () => {
    const groups = groupPages(
      [
        anchor(1, AIO, { index: 1, total: 2 }),
        unsure(2, { index: 2, total: 2 }),
        anchor(3, KYC3, { index: 1, total: 3 }),
        unsure(4, { index: 2, total: 3 }),
        unsure(5, { index: 3, total: 3 }),
      ],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: AIO.documentName, pages: [1, 2] },
      { documentName: KYC3.documentName, pages: [3, 4, 5] },
    ]);
  });

  it("breaks the run when adjacent stamps are not consecutive", () => {
    const groups = groupPages(
      [
        anchor(1, KYC3, { index: 2, total: 3 }),
        unsure(2, { index: 3, total: 3 }),
        unsure(3, { index: 2, total: 4 }),
      ],
      ARGS
    );

    expect(shape(groups)).toEqual([
      { documentName: KYC3.documentName, pages: [1, 2] },
      { documentName: UNSURE_DOCUMENT_NAME, pages: [3] },
    ]);
  });

  it("never merges pages across a gap in page numbers", () => {
    const groups = groupPages([anchor(1, AIO), unsure(3)], ARGS);

    expect(shape(groups)).toEqual([
      { documentName: AIO.documentName, pages: [1] },
      { documentName: UNSURE_DOCUMENT_NAME, pages: [3] },
    ]);
  });
});
