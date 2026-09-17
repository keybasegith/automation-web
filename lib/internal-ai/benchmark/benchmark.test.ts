import { describe, expect, it } from "vitest";

import { buildNeedlePrompt, loadDataset, materializePrompt } from "@/lib/internal-ai/benchmark/dataset";
import { gradeResponse, percentile } from "@/lib/internal-ai/benchmark/graders";
import {
  DEFAULT_WEIGHTS,
  rankCandidates,
  scoreCandidate,
  weightsAreValid,
  type CandidateEvaluation,
} from "@/lib/internal-ai/benchmark/scoring";

describe("dataset", () => {
  const dataset = loadDataset();

  it("loads prompts and criteria together", () => {
    expect(dataset.prompts.length).toBeGreaterThan(10);
    expect(Object.keys(dataset.behaviors).length).toBeGreaterThan(10);
  });

  it("covers all six evaluation categories", () => {
    const categories = new Set(dataset.prompts.map((p) => p.category));
    expect([...categories].sort()).toEqual([
      "compliance",
      "finance",
      "longcontext",
      "office",
      "reasoning",
      "structured",
    ]);
  });

  it("gives every prompt a unique id and a criterion", () => {
    const ids = dataset.prompts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(dataset.behaviors[id], `no criteria for ${id}`).toBeDefined();
    }
  });

  it("has no criteria for prompts that do not exist", () => {
    const ids = new Set(dataset.prompts.map((p) => p.id));
    for (const id of Object.keys(dataset.behaviors)) {
      expect(ids.has(id), `orphaned criteria for ${id}`).toBe(true);
    }
  });

  it("contains no real client or account data", () => {
    // The dataset is version-controlled, so this is a standing guard against
    // someone pasting a real case in to make a test more realistic.
    const text = JSON.stringify(dataset).toLowerCase();
    for (const marker of ["@keybase.com", "sin ", "social insurance", "account number"]) {
      expect(text).not.toContain(marker);
    }
  });
});

describe("long-context generation", () => {
  it("is deterministic, so two models see identical input", () => {
    const a = buildNeedlePrompt(2000);
    const b = buildNeedlePrompt(2000);
    expect(a.prompt).toBe(b.prompt);
    expect(a.needle).toBe(b.needle);
  });

  it("plants the needle inside the haystack", () => {
    const { prompt, needle } = buildNeedlePrompt(2000);
    expect(prompt).toContain(needle);
    expect(prompt).toContain("Question:");
  });

  it("does not plant the needle at the very start or end", () => {
    // A model that reads only the edges of its context must not score well.
    const { prompt, needle } = buildNeedlePrompt(4000);
    const position = prompt.indexOf(needle) / prompt.length;
    expect(position).toBeGreaterThan(0.02);
    expect(position).toBeLessThan(0.98);
  });

  it("grows with the requested size", () => {
    expect(buildNeedlePrompt(16000).prompt.length).toBeGreaterThan(
      buildNeedlePrompt(4000).prompt.length * 2
    );
  });

  it("materializes generated prompts and passes literals through", () => {
    const generated = materializePrompt({
      id: "x",
      category: "longcontext",
      prompt: "PLACEHOLDER",
      generator: { kind: "needle-in-haystack", approxTokens: 1000 },
    });
    expect(generated.text).not.toBe("PLACEHOLDER");
    expect(generated.needle).toBeDefined();

    const literal = materializePrompt({ id: "y", category: "office", prompt: "hello" });
    expect(literal).toEqual({ text: "hello" });
  });
});

describe("graders", () => {
  it("returns no score when there is nothing to check", () => {
    expect(gradeResponse("anything", undefined)).toEqual({
      score: null,
      checks: [],
      humanReview: null,
    });
  });

  it("checks required and forbidden mentions", () => {
    const grade = gradeResponse("Equity is 1,300,000 and net income is 450,000.", {
      mustMention: ["1,300,000", "450,000"],
      mustNotMention: ["seven years"],
    });
    expect(grade.score).toBe(1);
  });

  it("matches a number however it is punctuated", () => {
    // 1300000, 1,300,000 and 1 300 000 are the same answer.
    for (const written of ["1300000", "1,300,000", "1 300 000"]) {
      const grade = gradeResponse(`Equity is ${written}.`, { mustMention: ["1,300,000"] });
      expect(grade.checks[0].passed, written).toBe(true);
    }
  });

  it("does not let a digit match leak across unrelated words", () => {
    const grade = gradeResponse("The answer is unrelated.", { mustMention: ["450,000"] });
    expect(grade.checks[0].passed).toBe(false);
  });

  it("enforces a word budget", () => {
    const grade = gradeResponse("one two three four five", { maxWords: 3 });
    expect(grade.checks[0].passed).toBe(false);
    expect(grade.checks[0].detail).toBe("5 words");
  });

  it("detects an honest refusal", () => {
    const grade = gradeResponse(
      "SP-14 does not specify a retention period, so I cannot say.",
      { mustRefuse: true }
    );
    expect(grade.checks[0].passed).toBe(true);
  });

  it("flags a confident fabrication as needing a human", () => {
    const grade = gradeResponse("SP-14 requires retention for seven years.", {
      mustRefuse: true,
      mustNotMention: ["seven years"],
    });
    expect(grade.score).toBe(0);
    expect(grade.checks.some((c) => c.detail.includes("hard fail"))).toBe(true);
    expect(grade.checks.some((c) => c.detail.includes("likely fabricated"))).toBe(true);
  });

  it("requires a citation when one was asked for", () => {
    expect(
      gradeResponse("Clause 1 requires review.", { citationRequired: true }).checks[0].passed
    ).toBe(true);
    expect(
      gradeResponse("Yes, review is required.", { citationRequired: true }).checks[0].passed
    ).toBe(false);
  });

  it("validates a JSON object against its required structure", () => {
    const grade = gradeResponse(
      '{"title":"Review checklist","priority":"low","dueDays":14,"tags":["ops"]}',
      {
        formatValidity: "json-object",
        requiredStructure: {
          keys: ["title", "priority", "dueDays", "tags"],
          exactKeys: true,
          enums: { priority: ["low", "medium", "high"] },
          types: { title: "string", priority: "string", dueDays: "number", tags: "array" },
        },
      }
    );
    expect(grade.score).toBe(1);
  });

  it("catches a wrong type, an unexpected key, and a bad enum", () => {
    const grade = gradeResponse(
      '{"title":"x","priority":"urgent","dueDays":"14","tags":[],"extra":1}',
      {
        formatValidity: "json-object",
        requiredStructure: {
          keys: ["title", "priority", "dueDays", "tags"],
          exactKeys: true,
          enums: { priority: ["low", "medium", "high"] },
          types: { dueDays: "number" },
        },
      }
    );
    const failed = grade.checks.filter((c) => !c.passed).map((c) => c.name);
    expect(failed).toContain("keys");
    expect(failed).toContain("dueDays is number");
    expect(failed).toContain('priority within ["low","medium","high"]');
  });

  it("accepts fenced JSON but records the instruction miss separately", () => {
    const grade = gradeResponse('```json\n{"a":1}\n```', { formatValidity: "json-object" });
    const valid = grade.checks.find((c) => c.name === "valid json-object");
    const fence = grade.checks.find((c) => c.name.includes("code fence"));
    expect(valid?.passed).toBe(true);
    expect(fence?.passed).toBe(false);
  });

  it("fails invalid JSON and the wrong JSON shape", () => {
    expect(
      gradeResponse("not json at all", { formatValidity: "json-object" }).checks[0].passed
    ).toBe(false);
    expect(
      gradeResponse('{"a":1}', { formatValidity: "json-array" }).checks[0].passed
    ).toBe(false);
  });

  it("validates every item of an array against itemKeys", () => {
    const grade = gradeResponse(
      '[{"step":1,"action":"a"},{"step":2,"action":"b"},{"step":3}]',
      {
        formatValidity: "json-array",
        requiredStructure: { length: 3, itemKeys: ["step", "action"], exactKeys: true },
      }
    );
    expect(grade.checks.filter((c) => !c.passed).length).toBe(1);
  });

  it("checks the planted long-context fact", () => {
    expect(gradeResponse("RX-1234", { needleAnswer: true }, "RX-1234").score).toBe(1);
    expect(gradeResponse("RX-9999", { needleAnswer: true }, "RX-1234").score).toBe(0);
  });

  it("carries human-review notes through", () => {
    expect(gradeResponse("x", { humanReview: "Is the tone right?" }).humanReview).toBe(
      "Is the tone right?"
    );
  });
});

describe("percentile", () => {
  it("interpolates between samples", () => {
    const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(samples, 50)).toBeCloseTo(55);
    expect(percentile(samples, 0)).toBe(10);
    expect(percentile(samples, 100)).toBe(100);
  });

  it("handles a single sample and an empty set", () => {
    expect(percentile([42], 95)).toBe(42);
    expect(Number.isNaN(percentile([], 50))).toBe(true);
  });

  it("does not care about input order", () => {
    expect(percentile([90, 10, 50], 50)).toBe(50);
  });
});

describe("model selection scoring", () => {
  const perfect = {
    answerQuality: 1,
    latency: 1,
    concurrency: 1,
    instructionFollowing: 1,
    structuredOutput: 1,
    operationalStability: 1,
  };
  const allGatesPass = {
    survivedLoadTest: true,
    refusedToFabricate: true,
    fitsInMemory: true,
    producedValidStructuredOutput: true,
  };

  it("uses weights that sum to 1", () => {
    expect(weightsAreValid(DEFAULT_WEIGHTS)).toBe(true);
  });

  it("weights speed and concurrency above raw quality", () => {
    // The framework must not simply pick the biggest model.
    expect(DEFAULT_WEIGHTS.latency + DEFAULT_WEIGHTS.concurrency).toBeGreaterThan(
      DEFAULT_WEIGHTS.answerQuality
    );
  });

  it("rejects weights that no longer sum to 1", () => {
    expect(weightsAreValid({ ...DEFAULT_WEIGHTS, latency: 0.5 })).toBe(false);
    expect(weightsAreValid({ ...DEFAULT_WEIGHTS, latency: -0.1 })).toBe(false);
  });

  it("scores a perfect candidate at 1", () => {
    const scored = scoreCandidate({ model: "m", scores: perfect, gates: allGatesPass });
    expect(scored.weightedScore).toBeCloseTo(1);
    expect(scored.disqualified).toBe(false);
  });

  it("clamps out-of-range and non-finite scores", () => {
    const scored = scoreCandidate({
      model: "m",
      scores: { ...perfect, answerQuality: 5, latency: Number.NaN },
      gates: allGatesPass,
    });
    expect(scored.contributions.answerQuality).toBeCloseTo(DEFAULT_WEIGHTS.answerQuality);
    expect(scored.contributions.latency).toBe(0);
  });

  it("disqualifies a candidate that failed a hard gate", () => {
    const scored = scoreCandidate({
      model: "m",
      scores: perfect,
      gates: { ...allGatesPass, refusedToFabricate: false },
    });
    expect(scored.disqualified).toBe(true);
    expect(scored.failedGates[0]).toContain("invented a policy");
  });

  it("ranks a disqualified candidate last however high it scored", () => {
    const candidates: CandidateEvaluation[] = [
      { model: "big-but-broken", scores: perfect, gates: { ...allGatesPass, survivedLoadTest: false } },
      {
        model: "solid",
        scores: { ...perfect, answerQuality: 0.6 },
        gates: allGatesPass,
      },
    ];
    const ranked = rankCandidates(candidates);
    expect(ranked[0].model).toBe("solid");
    expect(ranked[1].model).toBe("big-but-broken");
    expect(ranked[1].weightedScore).toBeGreaterThan(ranked[0].weightedScore);
  });

  it("lets a faster model beat a smarter one under these weights", () => {
    const ranked = rankCandidates([
      {
        model: "quality-first",
        scores: { ...perfect, answerQuality: 1, latency: 0.3, concurrency: 0.3 },
        gates: allGatesPass,
      },
      {
        model: "performance-first",
        scores: { ...perfect, answerQuality: 0.75, latency: 1, concurrency: 1 },
        gates: allGatesPass,
      },
    ]);
    expect(ranked[0].model).toBe("performance-first");
  });
});
