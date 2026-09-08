import { describe, expect, it } from "vitest";

import { buildCacheKey, type CacheKeyParts } from "@/lib/keybase-answer/cache";

const BASE: CacheKeyParts = {
  question: "How are interest rates affecting Canadian markets?",
  contentIndexVersion: "2026-08-31T10:00:00.000Z",
  promptVersion: "2026-08-31.1",
  model: "gpt-5.6-terra",
  embeddingModel: "text-embedding-3-small",
  maxSources: 6,
};

describe("buildCacheKey", () => {
  it("is stable for the same inputs", () => {
    expect(buildCacheKey(BASE)).toBe(buildCacheKey(BASE));
  });

  it("ignores casing, spacing, and trailing punctuation in the question", () => {
    const variants = [
      "How are interest rates affecting Canadian markets?",
      "how are interest rates affecting canadian markets",
      "  How  are interest rates affecting Canadian markets ?? ",
    ];
    const keys = new Set(
      variants.map((question) => buildCacheKey({ ...BASE, question })),
    );
    expect(keys.size).toBe(1);
  });

  it("changes when the corpus is re-indexed", () => {
    // This is what stops a market commentary published this morning from being
    // answered with yesterday's cached view.
    expect(
      buildCacheKey({ ...BASE, contentIndexVersion: "2026-09-01T09:00:00.000Z" }),
    ).not.toBe(buildCacheKey(BASE));
  });

  it("changes when the instruction is edited", () => {
    expect(buildCacheKey({ ...BASE, promptVersion: "2026-09-02.1" })).not.toBe(
      buildCacheKey(BASE),
    );
  });

  it("changes when the generation model changes", () => {
    expect(buildCacheKey({ ...BASE, model: "gpt-5.6-luna" })).not.toBe(
      buildCacheKey(BASE),
    );
  });

  it("changes when the embedding model changes", () => {
    expect(
      buildCacheKey({ ...BASE, embeddingModel: "text-embedding-3-large" }),
    ).not.toBe(buildCacheKey(BASE));
  });

  it("changes when the source budget changes", () => {
    expect(buildCacheKey({ ...BASE, maxSources: 4 })).not.toBe(buildCacheKey(BASE));
  });

  it("separates two genuinely different questions", () => {
    expect(
      buildCacheKey({ ...BASE, question: "What is driving inflation in Canada?" }),
    ).not.toBe(buildCacheKey(BASE));
  });
});
