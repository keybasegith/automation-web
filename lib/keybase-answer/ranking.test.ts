import { describe, expect, it } from "vitest";

import { mockEmbedding } from "@/lib/keybase-answer/embeddings";
import {
  freshnessScore,
  groupIntoSources,
  keywordScore,
  rankChunks,
  weightsFor,
} from "@/lib/keybase-answer/ranking";
import type { KeybaseKnowledgeChunk, KnowledgeSourceKind } from "@/lib/keybase-answer/types";

const NOW = new Date("2026-08-31T00:00:00.000Z");

function chunk(
  id: string,
  text: string,
  options: {
    documentId?: string;
    chunkIndex?: number;
    publishedAt?: string;
    contentType?: KnowledgeSourceKind;
    category?: string;
  } = {},
): KeybaseKnowledgeChunk {
  return {
    id,
    documentId: options.documentId ?? id,
    chunkIndex: options.chunkIndex ?? 0,
    text,
    embedding: mockEmbedding(text),
    metadata: {
      title: id,
      canonicalUrl: `/newsroom/${options.documentId ?? id}`,
      category: options.category ?? "Market Perspectives",
      publishedAt: options.publishedAt,
      contentType: options.contentType ?? "insight",
    },
  };
}

describe("keywordScore", () => {
  it("rewards a passage that uses the question's own words", () => {
    const strong = keywordScore(
      "How are interest rates affecting Canadian markets?",
      "Higher interest rates have weighed on Canadian markets through several channels.",
    );
    const weak = keywordScore(
      "How are interest rates affecting Canadian markets?",
      "An RESP helps families save for a child's education.",
    );
    expect(strong).toBeGreaterThan(weak);
  });

  it("rewards an intact phrase over the same words scattered", () => {
    const phrase = keywordScore(
      "What did the Bank of Canada decide?",
      "The Bank of Canada held its policy rate steady.",
    );
    const scattered = keywordScore(
      "What did the Bank of Canada decide?",
      "Canada's largest bank will decide on its own outlook.",
    );
    expect(phrase).toBeGreaterThan(scattered);
  });

  it("is bounded to 0–1", () => {
    const score = keywordScore("inflation", "inflation inflation inflation inflation");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("freshnessScore", () => {
  it("decays with age", () => {
    const recent = freshnessScore("2026-08-01", NOW, 240);
    const old = freshnessScore("2024-08-01", NOW, 240);
    expect(recent).toBeGreaterThan(old);
  });

  it("halves at the half-life", () => {
    const halved = freshnessScore("2026-01-02", NOW, 241);
    expect(halved).toBeCloseTo(0.5, 1);
  });

  it("treats undated evergreen material as neutral, not stale", () => {
    expect(freshnessScore(undefined, NOW, 240)).toBe(0.5);
    expect(freshnessScore(undefined, NOW, 240)).toBeGreaterThan(
      freshnessScore("2015-01-01", NOW, 240),
    );
  });
});

describe("freshness weighting", () => {
  it("raises the weight on recency when the reader asks about now", () => {
    expect(weightsFor(true).freshness).toBeGreaterThan(weightsFor(false).freshness);
  });

  it("lets this month's commentary beat an older piece on a 'latest' question", () => {
    const question = "What is the latest Bank of Canada decision?";
    const chunks = [
      chunk("old", "The Bank of Canada decision and its effect on the policy rate.", {
        publishedAt: "2024-02-01",
      }),
      chunk("new", "The Bank of Canada decision and its effect on the policy rate.", {
        publishedAt: "2026-08-15",
      }),
    ];
    const options = {
      question,
      queryVector: mockEmbedding(question),
      now: NOW,
      halfLifeDays: 240,
    };

    const timeless = rankChunks(chunks, { ...options, freshnessIntent: false });
    const current = rankChunks(chunks, { ...options, freshnessIntent: true });

    // Identical text, so only recency separates them — and the gap must widen
    // when the question is about the current position.
    expect(current[0].chunk.id).toBe("new");
    expect(current[0].score - current[1].score).toBeGreaterThan(
      timeless[0].score - timeless[1].score,
    );
  });
});

describe("authority", () => {
  it("prefers a published article to a service page saying the same thing", () => {
    const text = "Diversification spreads risk across different kinds of holdings.";
    const ranked = rankChunks(
      [
        chunk("service", text, { contentType: "service" }),
        chunk("article", text, { contentType: "insight" }),
      ],
      {
        question: "How does diversification affect risk?",
        queryVector: mockEmbedding("How does diversification affect risk?"),
        now: NOW,
        freshnessIntent: false,
        halfLifeDays: 240,
      },
    );
    expect(ranked[0].chunk.id).toBe("article");
  });
});

describe("groupIntoSources", () => {
  const ranked = rankChunks(
    [
      chunk("a1", "Interest rates and borrowing costs across the economy.", {
        documentId: "doc-a",
        chunkIndex: 0,
      }),
      chunk("a2", "Interest rates also shape equity valuations over time.", {
        documentId: "doc-a",
        chunkIndex: 3,
      }),
      chunk("a3", "A short closing note about interest rates.", {
        documentId: "doc-a",
        chunkIndex: 1,
      }),
      chunk("b1", "An RESP helps families save for education costs.", {
        documentId: "doc-b",
        chunkIndex: 0,
      }),
    ],
    {
      question: "How do interest rates affect the economy?",
      queryVector: mockEmbedding("How do interest rates affect the economy?"),
      now: NOW,
      freshnessIntent: false,
      halfLifeDays: 240,
    },
  );

  it("collapses a document's chunks into one citable source", () => {
    const sources = groupIntoSources(ranked, {
      maxSources: 6,
      maxPassagesPerSource: 3,
    });
    expect(sources.map((s) => s.documentId)).toEqual(["doc-a", "doc-b"]);
  });

  it("assigns opaque ids in rank order", () => {
    const sources = groupIntoSources(ranked, {
      maxSources: 6,
      maxPassagesPerSource: 3,
    });
    expect(sources.map((s) => s.id)).toEqual(["SRC_001", "SRC_002"]);
  });

  it("restores the kept passages to document order", () => {
    const [first] = groupIntoSources(ranked, {
      maxSources: 6,
      maxPassagesPerSource: 3,
    });
    expect(first.passages).toHaveLength(3);
    expect(first.passages[0]).toContain("borrowing costs");
  });

  it("honours the source cap", () => {
    expect(
      groupIntoSources(ranked, { maxSources: 1, maxPassagesPerSource: 3 }),
    ).toHaveLength(1);
  });
});
