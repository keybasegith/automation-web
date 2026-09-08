import { describe, expect, it } from "vitest";

import {
  applyInlineMarkers,
  validateCitations,
} from "@/lib/keybase-answer/citation-validator";
import type { GeneratedAnswer } from "@/lib/keybase-answer/schemas";
import type { RetrievedSource } from "@/lib/keybase-answer/types";

function source(id: string, title: string): RetrievedSource {
  return {
    id,
    documentId: `doc-${id}`,
    title,
    canonicalUrl: `/newsroom/${title.toLowerCase().replace(/\W+/g, "-")}`,
    category: "Market Perspectives",
    contentType: "insight",
    publishedAt: "2026-07-21",
    passages: ["A passage."],
    score: 0.7,
    semantic: 0.7,
    keyword: 0.5,
    freshness: 0.9,
  };
}

const RETRIEVED = [
  source("SRC_001", "Rates and Canadian markets"),
  source("SRC_002", "Inflation in July"),
  source("SRC_003", "Understanding volatility"),
];

function answer(overrides: Partial<GeneratedAnswer> = {}): GeneratedAnswer {
  return {
    status: "success",
    summary: "A summary.",
    sections: [],
    sourceIds: [],
    relatedSourceIds: [],
    relatedQuestions: [],
    insufficientEvidence: false,
    personalizedAdviceRequest: false,
    ...overrides,
  };
}

describe("validateCitations", () => {
  it("drops a source id retrieval never supplied", () => {
    const result = validateCitations(
      answer({
        sourceIds: ["SRC_001", "SRC_999"],
        sections: [
          { heading: "Rates", body: "Body.", sourceIds: ["SRC_002", "SRC_404"] },
        ],
      }),
      RETRIEVED,
    );

    expect(result.sources.map((s) => s.id)).toEqual(["SRC_002", "SRC_001"]);
    expect(result.sections[0].sourceIds).toEqual(["SRC_002"]);
    expect(result.hallucinatedIds.sort()).toEqual(["SRC_404", "SRC_999"]);
  });

  it("never invents a URL — every href comes from the retrieved metadata", () => {
    const result = validateCitations(
      answer({ sourceIds: ["SRC_001"] }),
      RETRIEVED,
    );
    expect(result.sources[0].url).toBe(RETRIEVED[0].canonicalUrl);
    expect(result.sources[0].title).toBe(RETRIEVED[0].title);
    expect(result.sources[0].publishedAt).toBe("2026-07-21");
  });

  it("numbers sources by first appearance in the answer", () => {
    const result = validateCitations(
      answer({
        sourceIds: ["SRC_001"],
        sections: [
          { heading: "One", body: "b", sourceIds: ["SRC_003"] },
          { heading: "Two", body: "b", sourceIds: ["SRC_002"] },
        ],
      }),
      RETRIEVED,
    );
    expect(result.sources.map((s) => [s.id, s.marker])).toEqual([
      ["SRC_003", 1],
      ["SRC_002", 2],
      ["SRC_001", 3],
    ]);
  });

  it("does not list a cited source again as further reading", () => {
    const result = validateCitations(
      answer({ sourceIds: ["SRC_001"], relatedSourceIds: ["SRC_001", "SRC_002"] }),
      RETRIEVED,
    );
    expect(result.relatedInsights.map((r) => r.title)).not.toContain(
      "Rates and Canadian markets",
    );
    expect(result.relatedInsights[0].title).toBe("Inflation in July");
  });

  it("falls back to what retrieval found when the model nominated nothing", () => {
    const result = validateCitations(answer({ sourceIds: ["SRC_001"] }), RETRIEVED);
    expect(result.relatedInsights).toHaveLength(2);
    expect(result.relatedInsights.every((r) => r.url.startsWith("/newsroom/"))).toBe(
      true,
    );
  });

  it("returns no sources at all when every id was invented", () => {
    const result = validateCitations(
      answer({ sourceIds: ["SRC_900", "SRC_901"] }),
      RETRIEVED,
    );
    expect(result.sources).toEqual([]);
    expect(result.hallucinatedIds).toHaveLength(2);
  });
});

describe("applyInlineMarkers", () => {
  const sources = validateCitations(
    answer({ sourceIds: ["SRC_001", "SRC_002"] }),
    RETRIEVED,
  ).sources;

  it("turns an internal handle into a reader-facing marker", () => {
    expect(applyInlineMarkers("Rates rose SRC_001 last quarter.", sources)).toBe(
      "Rates rose [1] last quarter.",
    );
  });

  it("removes a marker that refers to nothing", () => {
    expect(applyInlineMarkers("Rates rose [SRC_777] last quarter.", sources)).toBe(
      "Rates rose last quarter.",
    );
  });

  it("does not leave a space before punctuation after removing one", () => {
    expect(applyInlineMarkers("Rates rose [SRC_777].", sources)).toBe("Rates rose.");
  });

  it("leaves prose without handles untouched", () => {
    const text = "Higher rates raise borrowing costs across the economy.";
    expect(applyInlineMarkers(text, sources)).toBe(text);
  });
});
