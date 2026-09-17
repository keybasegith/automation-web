/**
 * Scoring tests for the Client Risk Questionnaire.
 *
 * These lock the compliance-relevant behaviour: point values come from the
 * source form, totals are per-section, an unanswered question keeps a section
 * incomplete, and the final ranking is the LOWER of the two levels.
 */

import { describe, expect, it } from "vitest";

import {
  CAPACITY_QUESTION_IDS,
  QUESTIONS_BY_ID,
  RISK_QUESTIONS,
  TOLERANCE_QUESTION_IDS,
} from "@/lib/risk-questionnaire/config";
import {
  calculateSectionScore,
  deriveRiskProfile,
  getFinalRiskRanking,
  getLowerRiskLevel,
  getRiskLevel,
  resolveRiskLevel,
} from "@/lib/risk-questionnaire/scoring";
import type { ScoredQuestionId } from "@/lib/risk-questionnaire/types";

/** Picks the option worth exactly `points` for a question. */
const optionWorth = (id: ScoredQuestionId, points: number): string => {
  const option = QUESTIONS_BY_ID[id].options.find((o) => o.points === points);
  if (!option) throw new Error(`${id} has no option worth ${points} pts`);
  return option.id;
};

/** Answer sheet where every listed question takes its `points`-valued option. */
const answerAll = (
  ids: readonly ScoredQuestionId[],
  points: number,
): Partial<Record<ScoredQuestionId, string>> =>
  Object.fromEntries(ids.map((id) => [id, optionWorth(id, points)]));

describe("TEST 1 — Risk Capacity", () => {
  it("scores 60 / High when questions 1-6 all take the 10-point option", () => {
    const answers = answerAll(CAPACITY_QUESTION_IDS, 10);
    const profile = deriveRiskProfile(answers);

    expect(profile.capacity.score).toBe(60);
    expect(profile.capacityLevel).toBe("High");
  });
});

describe("TEST 2 — Risk Tolerance", () => {
  it("scores 60 / High when questions 7-12 all take the 10-point option", () => {
    const answers = answerAll(TOLERANCE_QUESTION_IDS, 10);
    const profile = deriveRiskProfile(answers);

    expect(profile.tolerance.score).toBe(60);
    expect(profile.toleranceLevel).toBe("High");
  });
});

describe("TESTS 3-5 — the lower level wins", () => {
  it("High capacity + Medium tolerance ranks Medium", () => {
    expect(getFinalRiskRanking("High", "Medium")).toBe("Medium");
  });

  it("Low Medium capacity + High tolerance ranks Low Medium", () => {
    expect(getFinalRiskRanking("Low Medium", "High")).toBe("Low Medium");
  });

  it("Medium High on both sides ranks Medium High", () => {
    expect(getFinalRiskRanking("Medium High", "Medium High")).toBe("Medium High");
  });

  it("never averages, sums, or picks the higher level", () => {
    expect(getFinalRiskRanking("Low", "High")).toBe("Low");
    expect(getFinalRiskRanking("High", "Low")).toBe("Low");
    expect(getLowerRiskLevel("Medium", "Low Medium")).toBe("Low Medium");
  });

  it("withholds a ranking until both levels are known", () => {
    expect(getFinalRiskRanking(null, "High")).toBeNull();
    expect(getFinalRiskRanking("High", null)).toBeNull();
  });
});

describe("TEST 6 — changing Q10 moves the tolerance total by the point delta", () => {
  it("swapping Portfolio A for Portfolio E adds exactly 8", () => {
    // q11's cheapest option is 4 pts — the rest of the section can take 2.
    const base: Partial<Record<ScoredQuestionId, string>> = {
      q7: optionWorth("q7", 2),
      q8: optionWorth("q8", 2),
      q9: optionWorth("q9", 2),
      q11: optionWorth("q11", 4),
      q12: optionWorth("q12", 2),
    };

    const withA = { ...base, q10: "q10_a" };
    const withE = { ...base, q10: "q10_e" };

    const scoreA = calculateSectionScore(withA, "tolerance").score!;
    const scoreE = calculateSectionScore(withE, "tolerance").score!;

    expect(scoreE - scoreA).toBe(8);
  });
});

describe("TESTS 7-8 — unscored questions stay unscored", () => {
  it("portfolio priority rankings are not part of any question's options", () => {
    const answers = answerAll(CAPACITY_QUESTION_IDS, 10);
    const before = deriveRiskProfile(answers);

    // Priorities and check frequency live outside `answers` entirely, so there
    // is no key they could occupy. Adding unknown keys must not change a total.
    const polluted = {
      ...answers,
      portfolioPriorities: "1",
      investmentCheckFrequency: "weekly",
    } as unknown as Partial<Record<ScoredQuestionId, string>>;

    expect(deriveRiskProfile(polluted).capacity.score).toBe(before.capacity.score);
  });

  it("no question in the config is the priority or check-frequency question", () => {
    const questionText = RISK_QUESTIONS.map((q) => q.question);
    expect(questionText).not.toContain("What is your priority for this portfolio?");
    expect(questionText).not.toContain(
      "How often do you check the value of your investments?",
    );
    expect(RISK_QUESTIONS).toHaveLength(12);
  });
});

describe("TEST 9 — an unanswered question does not become a zero", () => {
  it("leaves the section incomplete with a null score", () => {
    const answers = answerAll(CAPACITY_QUESTION_IDS, 10);
    delete answers.q4;

    const profile = deriveRiskProfile(answers);

    expect(profile.capacity.complete).toBe(false);
    expect(profile.capacity.score).toBeNull();
    expect(profile.capacity.answered).toBe(5);
    expect(profile.capacityLevel).toBeNull();
    expect(profile.finalRiskRanking).toBeNull();
  });

  it("ignores an option id that does not belong to the question", () => {
    const answers = { ...answerAll(CAPACITY_QUESTION_IDS, 10), q4: "q7_d" };
    expect(calculateSectionScore(answers, "capacity").complete).toBe(false);
  });
});

describe("TEST 10 — changing an answer replaces its points", () => {
  it("does not accumulate the old and new values", () => {
    const answers = answerAll(CAPACITY_QUESTION_IDS, 10);
    expect(calculateSectionScore(answers, "capacity").score).toBe(60);

    const changed = { ...answers, q1: optionWorth("q1", 6) };
    expect(calculateSectionScore(changed, "capacity").score).toBe(56);

    const changedBack = { ...changed, q1: optionWorth("q1", 10) };
    expect(calculateSectionScore(changedBack, "capacity").score).toBe(60);
  });
});

describe("risk level bands match the source form", () => {
  it.each([
    [0, "Low"],
    [11, "Low"],
    [13, "Low Medium"],
    [24, "Low Medium"],
    [25, "Medium"],
    [36, "Medium"],
    [37, "Medium High"],
    [48, "Medium High"],
    [49, "High"],
    [60, "High"],
  ])("score %i is %s", (score, level) => {
    expect(getRiskLevel(score as number)).toBe(level);
  });

  it("leaves the printed score-12 gap open rather than inventing a rule", () => {
    expect(getRiskLevel(12)).toBeNull();

    const resolution = resolveRiskLevel(12);
    expect(resolution.status).toBe("requires_review");
    expect(resolution).toMatchObject({
      reason:
        "Score 12 requires advisor review based on the source questionnaire threshold table.",
    });
  });

  it("cannot be reached by any real answer combination", () => {
    const minTotal = (ids: readonly ScoredQuestionId[]) =>
      ids.reduce(
        (sum, id) =>
          sum + Math.min(...QUESTIONS_BY_ID[id].options.map((o) => o.points)),
        0,
      );

    // Documented in config.ts: the lowest attainable totals are 15 and 14, so
    // the gap is unreachable in practice. If either drops to 12 or below, the
    // gap becomes real and Keybase must confirm the rule.
    expect(minTotal(CAPACITY_QUESTION_IDS)).toBe(15);
    expect(minTotal(TOLERANCE_QUESTION_IDS)).toBe(14);
  });
});

describe("worked example from the source methodology", () => {
  it("capacity 49 / High and tolerance 36 / Medium rank Medium", () => {
    const answers: Partial<Record<ScoredQuestionId, string>> = {
      q1: optionWorth("q1", 10),
      q2: optionWorth("q2", 8),
      q3: optionWorth("q3", 7),
      q4: optionWorth("q4", 10),
      q5: optionWorth("q5", 8),
      q6: optionWorth("q6", 6),
      q7: optionWorth("q7", 8),
      q8: optionWorth("q8", 4),
      q9: optionWorth("q9", 6),
      q10: optionWorth("q10", 6),
      q11: optionWorth("q11", 6),
      q12: optionWorth("q12", 6),
    };

    const profile = deriveRiskProfile(answers);

    expect(profile.capacity.score).toBe(49);
    expect(profile.capacityLevel).toBe("High");
    expect(profile.tolerance.score).toBe(36);
    expect(profile.toleranceLevel).toBe("Medium");
    expect(profile.finalRiskRanking).toBe("Medium");
    expect(profile.reviewNotice).toBeNull();
  });
});
