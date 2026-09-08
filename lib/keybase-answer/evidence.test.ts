import { describe, expect, it } from "vitest";

import { evaluateEvidence } from "@/lib/keybase-answer/evidence";
import type { RetrievedSource } from "@/lib/keybase-answer/types";

const NOW = new Date("2026-08-31T00:00:00.000Z");

function source(
  id: string,
  score: number,
  publishedAt?: string,
): RetrievedSource {
  return {
    id,
    documentId: `doc-${id}`,
    title: id,
    canonicalUrl: `/newsroom/${id}`,
    category: "Market Perspectives",
    contentType: "insight",
    publishedAt,
    passages: ["A passage."],
    score,
    semantic: score,
    keyword: score,
    freshness: 0.8,
  };
}

describe("evaluateEvidence", () => {
  it("refuses when nothing cleared the relevance floor", () => {
    const verdict = evaluateEvidence([source("a", 0.1), source("b", 0.05)], {
      freshnessIntent: false,
      now: NOW,
    });
    expect(verdict.sufficient).toBe(false);
    expect(verdict.reason).toBe("no_sources");
  });

  it("refuses on a single weak source", () => {
    const verdict = evaluateEvidence([source("a", 0.4)], {
      freshnessIntent: false,
      now: NOW,
    });
    expect(verdict.sufficient).toBe(false);
    expect(verdict.reason).toBe("too_few_sources");
  });

  it("accepts one authoritative source on its own", () => {
    // The point of the rule: a single Keybase article that squarely answers the
    // question is better evidence than two that glance off it.
    const verdict = evaluateEvidence([source("a", 0.72)], {
      freshnessIntent: false,
      now: NOW,
    });
    expect(verdict.sufficient).toBe(true);
    expect(verdict.sources).toHaveLength(1);
  });

  it("accepts two moderate sources", () => {
    const verdict = evaluateEvidence([source("a", 0.45), source("b", 0.4)], {
      freshnessIntent: false,
      now: NOW,
    });
    expect(verdict.sufficient).toBe(true);
  });

  it("keeps only the sources that cleared the floor", () => {
    const verdict = evaluateEvidence(
      [source("a", 0.6), source("b", 0.45), source("c", 0.02)],
      { freshnessIntent: false, now: NOW },
    );
    expect(verdict.sources.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("freshness intent", () => {
  it("refuses a 'latest' question when the material is all old", () => {
    const verdict = evaluateEvidence(
      [source("a", 0.8, "2023-01-15"), source("b", 0.7, "2022-06-01")],
      { freshnessIntent: true, now: NOW },
    );
    expect(verdict.sufficient).toBe(false);
    expect(verdict.reason).toBe("no_recent_material");
  });

  it("refuses a 'latest' question answered only by undated evergreen pages", () => {
    const verdict = evaluateEvidence([source("a", 0.8), source("b", 0.7)], {
      freshnessIntent: true,
      now: NOW,
    });
    expect(verdict.sufficient).toBe(false);
    expect(verdict.reason).toBe("no_recent_material");
  });

  it("accepts once one source is recent enough", () => {
    const verdict = evaluateEvidence(
      [source("a", 0.8, "2023-01-15"), source("b", 0.7, "2026-08-10")],
      { freshnessIntent: true, now: NOW },
    );
    expect(verdict.sufficient).toBe(true);
  });

  it("does not apply the recency rule to an evergreen question", () => {
    const verdict = evaluateEvidence(
      [source("a", 0.8, "2023-01-15"), source("b", 0.7, "2022-06-01")],
      { freshnessIntent: false, now: NOW },
    );
    expect(verdict.sufficient).toBe(true);
  });
});
