import { describe, expect, it } from "vitest";
import {
  canonicalizeIncomeBand,
  computeCrqRanking,
  lowerRiskLevel,
  scoreToRiskLevel,
} from "../normalize";
import { CRQ_INCOME_BANDS, NAAF_INCOME_BANDS } from "../vocab";

describe("canonicalizeIncomeBand", () => {
  it("maps every NAAF band to a canonical id", () => {
    expect(NAAF_INCOME_BANDS.map(canonicalizeIncomeBand)).toEqual([
      "under_25k",
      "25k_50k",
      "50k_75k",
      "75k_100k",
      "100k_125k",
      "125k_200k",
      "200k_1m",
      "1m_plus",
    ]);
  });

  it("maps every CRQ band to the same ids, in the same order", () => {
    expect(CRQ_INCOME_BANDS.map(canonicalizeIncomeBand)).toEqual(
      NAAF_INCOME_BANDS.map(canonicalizeIncomeBand)
    );
  });

  it("reconciles the wording that differs between the two forms", () => {
    // The whole point of table 8C: these pairs must not read as a mismatch.
    expect(canonicalizeIncomeBand("Under $25,000")).toBe(
      canonicalizeIncomeBand("Less than $25,000")
    );
    expect(canonicalizeIncomeBand("$1 Million and Over")).toBe(
      canonicalizeIncomeBand("$1,000,000 or more")
    );
  });

  it("tolerates whitespace and case noise", () => {
    expect(canonicalizeIncomeBand("  $25,000   -   $49,999 ")).toBe("25k_50k");
    expect(canonicalizeIncomeBand("$1 MILLION AND OVER")).toBe("1m_plus");
  });

  it("returns null rather than guessing on unknown input", () => {
    expect(canonicalizeIncomeBand("")).toBeNull();
    expect(canonicalizeIncomeBand(null)).toBeNull();
    expect(canonicalizeIncomeBand("$33,000")).toBeNull();
    expect(canonicalizeIncomeBand("garbage")).toBeNull();
  });
});

describe("scoreToRiskLevel (table 8B)", () => {
  it("maps each documented range to its level", () => {
    expect(scoreToRiskLevel(0)).toBe("Low");
    expect(scoreToRiskLevel(11)).toBe("Low");
    expect(scoreToRiskLevel(13)).toBe("Low Medium");
    expect(scoreToRiskLevel(24)).toBe("Low Medium");
    expect(scoreToRiskLevel(25)).toBe("Medium");
    expect(scoreToRiskLevel(36)).toBe("Medium");
    expect(scoreToRiskLevel(37)).toBe("Medium High");
    expect(scoreToRiskLevel(48)).toBe("Medium High");
    expect(scoreToRiskLevel(49)).toBe("High");
    expect(scoreToRiskLevel(120)).toBe("High");
  });

  it("[CONFIRM #1] treats the undefined boundary value 12 as Low by default", () => {
    expect(scoreToRiskLevel(12)).toBe("Low");
  });

  it("[CONFIRM #1] the 12 boundary follows config", () => {
    expect(scoreToRiskLevel(12, { lowBandUpperBound: 11, planRiskColumnPriority: "new", includeNotesInEmail: false })).toBe(
      "Low Medium"
    );
  });

  it("returns null for a missing total", () => {
    expect(scoreToRiskLevel(null)).toBeNull();
    expect(scoreToRiskLevel(Number.NaN)).toBeNull();
  });
});

describe("lowerRiskLevel", () => {
  it("takes the more constraining of the two levels", () => {
    expect(lowerRiskLevel("High", "Low")).toBe("Low");
    expect(lowerRiskLevel("Low Medium", "Medium High")).toBe("Low Medium");
    expect(lowerRiskLevel("Medium", "Medium")).toBe("Medium");
  });

  it("is null unless both levels are known", () => {
    expect(lowerRiskLevel("High", null)).toBeNull();
    expect(lowerRiskLevel(null, null)).toBeNull();
  });
});

describe("computeCrqRanking", () => {
  it("derives the ranking from the two totals", () => {
    // Capacity 50 -> High, Tolerance 20 -> Low Medium; the lower wins.
    expect(computeCrqRanking(50, 20)).toBe("Low Medium");
    expect(computeCrqRanking(30, 30)).toBe("Medium");
  });

  it("is null when either total is missing", () => {
    expect(computeCrqRanking(null, 30)).toBeNull();
    expect(computeCrqRanking(30, null)).toBeNull();
  });
});
