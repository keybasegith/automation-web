import { describe, expect, it } from "vitest";

import { normalizeAccountCode } from "../accounts/normalizeAccount";
import { matchPrecedence, resolveAccount, ruleMatches } from "../mapping/resolveMapping";
import { rule } from "./helpers";

const account = (code: string) => normalizeAccountCode(code)!;

describe("match types", () => {
  it("EXACT_FULL_CODE matches one whole account and nothing else", () => {
    const r = rule({ id: "x", matchType: "EXACT_FULL_CODE", fullCode: "3100-K-I" });
    expect(ruleMatches(r, account("3100-K-I"))).toBe(true);
    expect(ruleMatches(r, account("3100-k-i"))).toBe(true); // normalized
    expect(ruleMatches(r, account("3100-K-P"))).toBe(false);
    expect(ruleMatches(r, account("3100-K"))).toBe(false);
    // Deliberately not a prefix match: an unknown deeper sub-account must
    // surface rather than be absorbed.
    expect(ruleMatches(r, account("3100-K-I-002"))).toBe(false);
  });

  it("BASE_GL_CODE matches every sub-account of one base", () => {
    const r = rule({ id: "x", matchType: "BASE_GL_CODE", baseCode: "1101" });
    expect(ruleMatches(r, account("1101-K"))).toBe(true);
    expect(ruleMatches(r, account("1101-K-00008"))).toBe(true);
    expect(ruleMatches(r, account("1102-K"))).toBe(false);
    // The danger a prefix match would create, and this does not.
    expect(ruleMatches(r, account("11010-K"))).toBe(false);
  });

  it("GL_CODE_SET matches any listed base code", () => {
    const r = rule({ id: "x", matchType: "GL_CODE_SET", accounts: ["1000", "1001", "1008"] });
    expect(ruleMatches(r, account("1008-K"))).toBe(true);
    expect(ruleMatches(r, account("1009-K"))).toBe(false);
  });

  it("NUMERIC_RANGE matches inclusively at both ends", () => {
    const r = rule({ id: "x", matchType: "NUMERIC_RANGE", from: 5420, to: 5559 });
    expect(ruleMatches(r, account("5420-K"))).toBe(true);
    expect(ruleMatches(r, account("5559-K"))).toBe(true);
    expect(ruleMatches(r, account("5419-K"))).toBe(false);
    expect(ruleMatches(r, account("5560-K"))).toBe(false);
  });

  it("ignores inactive rules", () => {
    const r = rule({ id: "x", matchType: "BASE_GL_CODE", baseCode: "1000", status: "inactive" });
    expect(ruleMatches(r, account("1000-K"))).toBe(false);
  });
});

describe("precedence", () => {
  it("ranks exact above code sets above ranges", () => {
    expect(matchPrecedence("EXACT_FULL_CODE")).toBeLessThan(matchPrecedence("BASE_GL_CODE"));
    expect(matchPrecedence("BASE_GL_CODE")).toBe(matchPrecedence("GL_CODE_SET"));
    expect(matchPrecedence("GL_CODE_SET")).toBeLessThan(matchPrecedence("NUMERIC_RANGE"));
  });

  it("lets a code set carve accounts out of a broader range", () => {
    const rules = [
      rule({ id: "capital", matchType: "NUMERIC_RANGE", from: 1450, to: 1999, statementLine: "Capital Assets" }),
      rule({ id: "rou", matchType: "GL_CODE_SET", accounts: ["1950"], statementLine: "Right of Use Asset-Office" }),
    ];
    expect(resolveAccount(rules, account("1950-K")).rule?.statementLine).toBe("Right of Use Asset-Office");
    expect(resolveAccount(rules, account("1500-K")).rule?.statementLine).toBe("Capital Assets");
  });

  it("lets an exact rule override the base rule for its siblings", () => {
    const rules = [
      rule({ id: "base", matchType: "BASE_GL_CODE", baseCode: "3100", statementLine: "Intercompany" }),
      rule({ id: "exact", matchType: "EXACT_FULL_CODE", fullCode: "3100-K-P", statementLine: "Argosy" }),
    ];
    expect(resolveAccount(rules, account("3100-K-P")).rule?.statementLine).toBe("Argosy");
    expect(resolveAccount(rules, account("3100-K-I")).rule?.statementLine).toBe("Intercompany");
  });
});

describe("collisions", () => {
  it("blocks when equally specific rules disagree, rather than taking the first", () => {
    const rules = [
      rule({ id: "a", matchType: "BASE_GL_CODE", baseCode: "7750", statementLine: "Bonus" }),
      rule({ id: "b", matchType: "BASE_GL_CODE", baseCode: "7750", statementLine: "Management Fees" }),
    ];
    const resolution = resolveAccount(rules, account("7750-K"));
    expect(resolution.outcome).toBe("ambiguous");
    expect(resolution.rule).toBeNull();
    expect(resolution.conflicting.map((r) => r.id).sort()).toEqual(["a", "b"]);
  });

  it("blocks when a mapping and an exclusion disagree at the same specificity", () => {
    const rules = [
      rule({ id: "a", matchType: "BASE_GL_CODE", baseCode: "8000", statementLine: "Income Tax Provision" }),
      rule({ id: "b", matchType: "BASE_GL_CODE", baseCode: "8000", statementLine: "", excluded: true }),
    ];
    expect(resolveAccount(rules, account("8000-K")).outcome).toBe("ambiguous");
  });

  it("accepts duplicate rules that agree", () => {
    const rules = [
      rule({ id: "a", matchType: "BASE_GL_CODE", baseCode: "1000", statementLine: "Cash" }),
      rule({ id: "b", matchType: "BASE_GL_CODE", baseCode: "1000", statementLine: "Cash" }),
    ];
    expect(resolveAccount(rules, account("1000-K")).outcome).toBe("mapped");
  });
});

describe("outcomes", () => {
  it("reports an unclaimed account as unmapped and never guesses", () => {
    const resolution = resolveAccount(
      [rule({ id: "a", matchType: "BASE_GL_CODE", baseCode: "1000" })],
      account("7127-K")
    );
    expect(resolution.outcome).toBe("unmapped");
    expect(resolution.rule).toBeNull();
    expect(resolution.candidates).toEqual([]);
  });

  it("reports an excluded account distinctly from an unmapped one", () => {
    const resolution = resolveAccount(
      [rule({ id: "a", matchType: "BASE_GL_CODE", baseCode: "1080", excluded: true, statementLine: "" })],
      account("1080-K")
    );
    expect(resolution.outcome).toBe("excluded");
    expect(resolution.rule?.id).toBe("a");
  });

  it("never lets a control rule claim an account", () => {
    const resolution = resolveAccount(
      [rule({ id: "cpe", matchType: "NUMERIC_RANGE", from: 4500, to: 9999, role: "current_period_earnings" })],
      account("5000-K")
    );
    expect(resolution.outcome).toBe("unmapped");
  });
});
