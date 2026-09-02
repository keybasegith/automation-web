/**
 * Mapping table validation.
 *
 * Runs before anything is saved. A table that would let one account be claimed
 * by two equally specific rules that disagree is rejected outright rather than
 * accepted and resolved at generation time — the point is that a finance user
 * finds out while editing, not a month later on a statement.
 */

import type { MappingRule, StatementKind } from "../types";
import { SECTION_NATURAL_BALANCE } from "../config/statementPresentation";
import { matchPrecedence } from "./resolveMapping";

export interface MappingCollision {
  baseCode: string;
  ruleIds: string[];
  detail: string;
}

export interface MappingValidation {
  errors: string[];
  warnings: string[];
  collisions: MappingCollision[];
  isValid: boolean;
}

const CODE = /^\d{1,8}$/;

/** Which base codes a rule claims, for overlap analysis. */
function claimsBase(rule: MappingRule, base: number): boolean {
  if (rule.status !== "active") return false;
  if (rule.role === "current_period_earnings") return false;
  const code = String(base).padStart(4, "0");
  switch (rule.matchType) {
    case "BASE_GL_CODE":
      return rule.baseCode === code;
    case "GL_CODE_SET":
      return (rule.accounts ?? []).includes(code);
    case "NUMERIC_RANGE":
      return base >= (rule.from ?? -1) && base <= (rule.to ?? -1);
    case "EXACT_FULL_CODE":
      // Strictly narrower than every other type, so it never ties with them.
      return false;
  }
}

/**
 * Every base code where two rules of equal specificity disagree. Sweeping the
 * whole code space is cheap and catches overlaps a spot check would not.
 */
export function findCollisions(rules: readonly MappingRule[]): MappingCollision[] {
  const collisions: MappingCollision[] = [];

  for (let base = 0; base < 10000; base++) {
    const hits = rules.filter((r) => claimsBase(r, base));
    if (hits.length < 2) continue;

    const best = Math.min(...hits.map((r) => matchPrecedence(r.matchType)));
    const top = hits.filter((r) => matchPrecedence(r.matchType) === best);
    const targets = new Set(
      top.map((r) => `${r.statement}|${r.statementLine}|${r.excluded}`)
    );
    if (targets.size < 2) continue;

    collisions.push({
      baseCode: String(base).padStart(4, "0"),
      ruleIds: top.map((r) => r.id),
      detail: top
        .map((r) => `${r.id} → ${r.excluded ? "excluded" : r.statementLine}`)
        .join(" vs "),
    });
  }

  // Exact rules only ever collide with an identical exact rule.
  const byFullCode = new Map<string, MappingRule[]>();
  for (const rule of rules) {
    if (rule.matchType !== "EXACT_FULL_CODE" || rule.status !== "active" || !rule.fullCode) continue;
    byFullCode.set(rule.fullCode, [...(byFullCode.get(rule.fullCode) ?? []), rule]);
  }
  for (const [fullCode, group] of byFullCode) {
    const targets = new Set(group.map((r) => `${r.statement}|${r.statementLine}|${r.excluded}`));
    if (targets.size < 2) continue;
    collisions.push({
      baseCode: fullCode,
      ruleIds: group.map((r) => r.id),
      detail: group.map((r) => `${r.id} → ${r.excluded ? "excluded" : r.statementLine}`).join(" vs "),
    });
  }

  return collisions;
}

export function validateMappings(rules: readonly MappingRule[]): MappingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const ids = new Set<string>();
  for (const rule of rules) {
    const where = `Mapping "${rule.id || "(no id)"}"`;

    if (!rule.id) errors.push("A mapping is missing its id.");
    else if (ids.has(rule.id)) errors.push(`${where} is defined more than once.`);
    ids.add(rule.id);

    if (rule.statement !== "balance_sheet" && rule.statement !== "income_statement") {
      errors.push(`${where} must belong to the Balance Sheet or the Income Statement.`);
    }

    if (!rule.excluded && !rule.statementLine.trim()) {
      errors.push(`${where} needs a statement line, or must be marked excluded.`);
    }
    if (rule.excluded && !rule.exclusionReason?.trim()) {
      errors.push(`${where} is excluded but records no reason.`);
    }

    if (!rule.section?.trim()) errors.push(`${where} needs a section.`);
    else if (!SECTION_NATURAL_BALANCE[rule.section]) {
      errors.push(
        `${where} uses the unknown section "${rule.section}". Pick one of: ${Object.keys(SECTION_NATURAL_BALANCE).join(", ")}.`
      );
    }

    switch (rule.matchType) {
      case "EXACT_FULL_CODE":
        if (!rule.fullCode || !/^\d{1,8}(-[A-Z0-9]{1,6})+$/.test(rule.fullCode)) {
          errors.push(`${where} needs a full account code such as 3100-K-I.`);
        }
        break;
      case "BASE_GL_CODE":
        if (!rule.baseCode || !CODE.test(rule.baseCode)) {
          errors.push(`${where} needs a GL account number such as 1000.`);
        }
        break;
      case "GL_CODE_SET":
        if (!rule.accounts || rule.accounts.length === 0) {
          errors.push(`${where} needs at least one GL account number.`);
        } else {
          for (const code of rule.accounts) {
            if (!CODE.test(code)) errors.push(`${where} lists "${code}", which is not a GL account number.`);
          }
          if (new Set(rule.accounts).size !== rule.accounts.length) {
            warnings.push(`${where} lists the same account more than once.`);
          }
        }
        break;
      case "NUMERIC_RANGE":
        if (typeof rule.from !== "number" || typeof rule.to !== "number") {
          errors.push(`${where} needs a from and a to account number.`);
        } else if (rule.from > rule.to) {
          errors.push(`${where} has a range that runs backwards (${rule.from} to ${rule.to}).`);
        }
        break;
      default:
        errors.push(`${where} uses an unknown match type.`);
    }
  }

  const collisions = findCollisions(rules);
  for (const collision of collisions) {
    errors.push(
      `Account ${collision.baseCode} would be claimed by conflicting mappings: ${collision.detail}.`
    );
  }

  return { errors, warnings, collisions, isValid: errors.length === 0 };
}

/** A finance-readable description of what a rule matches. No syntax. */
export function describeRule(rule: MappingRule): string {
  switch (rule.matchType) {
    case "EXACT_FULL_CODE":
      return `${rule.fullCode} (exact account)`;
    case "BASE_GL_CODE":
      return rule.baseCode ?? "";
    case "GL_CODE_SET":
      return (rule.accounts ?? []).join(", ");
    case "NUMERIC_RANGE":
      return `${rule.from}–${rule.to}`;
  }
}

export const statementLabel = (statement: StatementKind): string =>
  statement === "balance_sheet" ? "Balance Sheet" : "Income Statement";
