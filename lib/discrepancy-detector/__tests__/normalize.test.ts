import { describe, expect, it } from "vitest";
import {
  canonicalizeIncomeBand,
  compareIncomeBands,
  computeCrqRanking,
  lowerRiskLevel,
  scoreToRiskLevel,
} from "../normalize";
import { CRQ25_INCOME_BANDS, NAAF_INCOME_BANDS } from "../vocab";

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

  it("maps every v2-crq25 band to the same ids, in the same order", () => {
    // Only this revision shares the NAAF's eight-band scale. crq24's six wider
    // bands deliberately do not canonicalize onto it — see compareIncomeBands.
    expect(CRQ25_INCOME_BANDS.map(canonicalizeIncomeBand)).toEqual(
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

describe("scoreToRiskLevel — per revision, per column", () => {
  it("maps each v2-crq25 range to its level", () => {
    const at = (n: number) => scoreToRiskLevel(n, "capacity", "v2-crq25");
    expect(at(0)).toBe("Low");
    expect(at(11)).toBe("Low");
    expect(at(13)).toBe("Low Medium");
    expect(at(24)).toBe("Low Medium");
    expect(at(25)).toBe("Medium");
    expect(at(36)).toBe("Medium");
    expect(at(37)).toBe("Medium High");
    expect(at(48)).toBe("Medium High");
    expect(at(49)).toBe("High");
    expect(at(120)).toBe("High");
  });

  it("scores v2-crq25 the same on both columns", () => {
    for (const n of [0, 12, 25, 40, 60]) {
      expect(scoreToRiskLevel(n, "capacity", "v2-crq25")).toBe(
        scoreToRiskLevel(n, "tolerance", "v2-crq25")
      );
    }
  });

  it("maps each crq24 Risk Capacity range to its level", () => {
    // Printed: < 40 | 40 - 50 | 51 - 60 | 61 - 70 | > 70
    const at = (n: number) => scoreToRiskLevel(n, "capacity", "crq24");
    expect(at(0)).toBe("Low");
    expect(at(39)).toBe("Low");
    expect(at(40)).toBe("Low Medium");
    expect(at(50)).toBe("Low Medium");
    expect(at(51)).toBe("Medium");
    expect(at(60)).toBe("Medium");
    expect(at(61)).toBe("Medium High");
    expect(at(70)).toBe("Medium High");
    expect(at(71)).toBe("High");
  });

  it("maps each crq24 Risk Tolerance range to its level", () => {
    // Printed: < 20 | 20 - 30 | 31 - 40 | 41 - 50 | > 50
    const at = (n: number) => scoreToRiskLevel(n, "tolerance", "crq24");
    expect(at(19)).toBe("Low");
    expect(at(20)).toBe("Low Medium");
    expect(at(30)).toBe("Low Medium");
    expect(at(31)).toBe("Medium");
    expect(at(40)).toBe("Medium");
    expect(at(41)).toBe("Medium High");
    expect(at(50)).toBe("Medium High");
    expect(at(51)).toBe("High");
  });

  it("scores crq24's two columns differently — the whole reason `kind` exists", () => {
    // 46 is Low Medium as a capacity score but Medium High as a tolerance one.
    expect(scoreToRiskLevel(46, "capacity", "crq24")).toBe("Low Medium");
    expect(scoreToRiskLevel(46, "tolerance", "crq24")).toBe("Medium High");
  });

  it("[CONFIRM #1] treats the undefined boundary value 12 as Low by default", () => {
    expect(scoreToRiskLevel(12, "capacity", "v2-crq25")).toBe("Low");
  });

  it("[CONFIRM #1] the 12 boundary follows config, and only on v2-crq25", () => {
    const config = {
      lowBandUpperBound: 11,
      planRiskColumnPriority: "new" as const,
      includeNotesInEmail: false,
    };
    expect(scoreToRiskLevel(12, "capacity", "v2-crq25", config)).toBe("Low Medium");
    // crq24 has no gap at its first boundary, so the override must not reach it.
    expect(scoreToRiskLevel(12, "capacity", "crq24", config)).toBe("Low");
  });

  it("returns null for a missing total", () => {
    expect(scoreToRiskLevel(null, "capacity", "v2-crq25")).toBeNull();
    expect(scoreToRiskLevel(Number.NaN, "capacity", "v2-crq25")).toBeNull();
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
  it("derives the ranking from the two totals on v2-crq25", () => {
    // Capacity 50 -> High, Tolerance 20 -> Low Medium; the lower wins.
    expect(computeCrqRanking(50, 20, "v2-crq25")).toBe("Low Medium");
    expect(computeCrqRanking(30, 30, "v2-crq25")).toBe("Medium");
  });

  it("derives the ranking from crq24's two different tables", () => {
    // Capacity 72 -> High (> 70), Tolerance 46 -> Medium High (41 - 50).
    expect(computeCrqRanking(72, 46, "crq24")).toBe("Medium High");
    // The same pair read with v2-crq25's table happens to agree here, which is
    // exactly why a version mix-up can go unnoticed; this pair does not.
    expect(computeCrqRanking(55, 25, "crq24")).toBe("Low Medium");
    expect(computeCrqRanking(55, 25, "v2-crq25")).toBe("Medium");
  });

  it("is null when either total is missing", () => {
    expect(computeCrqRanking(null, 30, "v2-crq25")).toBeNull();
    expect(computeCrqRanking(30, null, "v2-crq25")).toBeNull();
  });

  it("is null when the revision is unknown, rather than guessing a table", () => {
    expect(computeCrqRanking(50, 20, null)).toBeNull();
  });
});

describe("compareIncomeBands", () => {
  it("calls identical bands the same", () => {
    expect(compareIncomeBands("$75,000 - $99,999", "$75,000 - $99,999")).toBe("same");
  });

  it("matches the two forms' different wording at the ends", () => {
    expect(compareIncomeBands("Under $25,000", "Less than $25,000")).toBe("same");
    expect(compareIncomeBands("$1 Million and Over", "$1,000,000 or more")).toBe("same");
  });

  it("treats a NAAF band inside a wider crq24 band as agreement", () => {
    // crq24's "$75,000 - $149,999" covers two NAAF bands on its own.
    expect(compareIncomeBands("$75,000 - $99,999", "$75,000 - $149,999")).toBe("contained");
    expect(compareIncomeBands("$100,000 - $124,999", "$75,000 - $149,999")).toBe("contained");
  });

  it("flags a partial overlap, which neither answer can fully explain", () => {
    // NAAF $125,000-$199,999 straddles crq24's $75,000-$149,999 boundary.
    expect(compareIncomeBands("$125,000 - $199,999", "$75,000 - $149,999")).toBe("overlapping");
  });

  it("flags bands that share no income at all", () => {
    expect(compareIncomeBands("$25,000 - $49,999", "$150,000 - $249,999")).toBe("disjoint");
    expect(compareIncomeBands("Under $25,000", "$250,000 or more")).toBe("disjoint");
  });

  it("is null when either band is missing or unreadable", () => {
    expect(compareIncomeBands(null, "$75,000 - $149,999")).toBeNull();
    expect(compareIncomeBands("not a band", "$75,000 - $149,999")).toBeNull();
  });
});
