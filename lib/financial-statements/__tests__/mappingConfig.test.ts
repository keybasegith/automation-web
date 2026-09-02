/**
 * Integrity of the migrated mapping table itself, independent of any Trial
 * Balance. These are the guarantees the legacy workbook could not make.
 */

import { describe, expect, it } from "vitest";

import { BALANCE_SHEET_MAPPINGS } from "../config/balanceSheetMappings";
import { INCOME_STATEMENT_MAPPINGS } from "../config/incomeStatementMappings";
import { SECTION_NATURAL_BALANCE } from "../config/statementPresentation";
import { matchPrecedence } from "../mapping/resolveMapping";
import type { MappingRule } from "../types";

const ALL: MappingRule[] = [...BALANCE_SHEET_MAPPINGS, ...INCOME_STATEMENT_MAPPINGS];

describe("mapping table integrity", () => {
  it("carries no legacy wildcard syntax anywhere", () => {
    const serialised = JSON.stringify(ALL);
    expect(serialised).not.toContain("%");
    expect(serialised).not.toContain("*");
    expect(serialised).not.toContain("\\");
  });

  it("gives every rule a unique id", () => {
    const ids = ALL.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every rule the fields its match type requires", () => {
    for (const r of ALL) {
      if (r.matchType === "EXACT_FULL_CODE") expect(r.fullCode).toMatch(/^\d{1,8}(-[A-Z0-9]{1,6})+$/);
      if (r.matchType === "BASE_GL_CODE") expect(r.baseCode).toMatch(/^\d{1,8}$/);
      if (r.matchType === "GL_CODE_SET") {
        expect(r.accounts?.length).toBeGreaterThan(0);
        for (const code of r.accounts ?? []) expect(code).toMatch(/^\d{1,8}$/);
      }
      if (r.matchType === "NUMERIC_RANGE") {
        expect(typeof r.from).toBe("number");
        expect(typeof r.to).toBe("number");
        expect(r.from!).toBeLessThanOrEqual(r.to!);
      }
    }
  });

  it("places every rule in a section with a known natural balance", () => {
    for (const r of ALL) {
      if (r.role === "current_period_earnings") continue;
      expect(SECTION_NATURAL_BALANCE[r.section]).toBeDefined();
    }
  });

  it("gives every exclusion a recorded reason", () => {
    for (const r of ALL.filter((x) => x.excluded)) {
      expect(r.exclusionReason).toBeTruthy();
      expect(r.statementLine).toBe("");
    }
  });

  /**
   * The property that makes the table safe: sweep every base code a GL account
   * could carry and confirm no account could be claimed by two equally specific
   * rules that disagree. This is what the legacy first-match rule papered over.
   */
  it("contains no same-specificity collision anywhere in the code space", () => {
    const claims = (rule: MappingRule, base: number): boolean => {
      if (rule.role === "current_period_earnings") return false;
      switch (rule.matchType) {
        case "BASE_GL_CODE": return rule.baseCode === String(base).padStart(4, "0");
        case "GL_CODE_SET": return (rule.accounts ?? []).includes(String(base).padStart(4, "0"));
        case "NUMERIC_RANGE": return base >= rule.from! && base <= rule.to!;
        case "EXACT_FULL_CODE": return false; // strictly narrower; never ties with these
      }
    };

    const collisions: string[] = [];
    for (let base = 0; base < 10000; base++) {
      const hits = ALL.filter((r) => claims(r, base));
      if (hits.length < 2) continue;
      const best = Math.min(...hits.map((r) => matchPrecedence(r.matchType)));
      const top = hits.filter((r) => matchPrecedence(r.matchType) === best);
      const distinct = new Set(
        top.map((r) => `${r.statement}|${r.statementLine}|${r.excluded}`)
      );
      if (distinct.size > 1) {
        collisions.push(`${base}: ${top.map((r) => `${r.id}->${r.statementLine || "EXCLUDED"}`).join(" vs ")}`);
      }
    }
    expect(collisions).toEqual([]);
  });

  it("keeps the current-period-earnings span as a control rule only", () => {
    const control = ALL.filter((r) => r.role === "current_period_earnings");
    expect(control).toHaveLength(1);
    expect(control[0].matchType).toBe("NUMERIC_RANGE");
    expect(control[0].from).toBe(4500);
    expect(control[0].to).toBe(9999);
  });

  it("keeps balance sheet and income statement rules in separate code spaces", () => {
    // Nothing but the control rule may straddle both statements, or an account
    // would land on two statements at once.
    const bsBases = new Set<number>();
    for (let base = 0; base < 10000; base++) {
      for (const r of BALANCE_SHEET_MAPPINGS) {
        if (r.role === "current_period_earnings") continue;
        const code = String(base).padStart(4, "0");
        const hit =
          (r.matchType === "BASE_GL_CODE" && r.baseCode === code) ||
          (r.matchType === "GL_CODE_SET" && (r.accounts ?? []).includes(code)) ||
          (r.matchType === "NUMERIC_RANGE" && base >= r.from! && base <= r.to!) ||
          (r.matchType === "EXACT_FULL_CODE" && r.fullCode!.split("-")[0] === code);
        if (hit) bsBases.add(base);
      }
    }
    const overlaps: number[] = [];
    for (let base = 0; base < 10000; base++) {
      if (!bsBases.has(base)) continue;
      const code = String(base).padStart(4, "0");
      const onIs = INCOME_STATEMENT_MAPPINGS.some(
        (r) =>
          (r.matchType === "BASE_GL_CODE" && r.baseCode === code) ||
          (r.matchType === "GL_CODE_SET" && (r.accounts ?? []).includes(code)) ||
          (r.matchType === "NUMERIC_RANGE" && base >= r.from! && base <= r.to!) ||
          (r.matchType === "EXACT_FULL_CODE" && r.fullCode!.split("-")[0] === code)
      );
      if (onIs) overlaps.push(base);
    }
    expect(overlaps).toEqual([]);
  });
});
