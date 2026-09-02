/**
 * Deterministic mapping resolution.
 *
 * An account is claimed by a rule or it is not. There is no fuzzy matching, no
 * description parsing, no inference from the sign of the balance and no
 * "closest" rule. An account nothing claims becomes a blocking exception and
 * stays off both statements.
 *
 * Precedence between match types is fixed and total:
 *
 *   1. EXACT_FULL_CODE   — names one whole account, sub-account included
 *   2. BASE_GL_CODE / GL_CODE_SET — names base codes
 *   3. NUMERIC_RANGE     — a span of base codes
 *
 * A narrower rule therefore always beats a broader one, which is what lets
 * "Right of Use Asset-Office" (a code set) carve 1950 and 2950 out of the
 * Capital Assets ranges without either rule needing to know about the other.
 *
 * Precedence resolves *tiers*. It deliberately does not resolve a tie inside a
 * tier: two rules of equal specificity that disagree are an `ambiguous_mapping`
 * exception, never a silent first-wins. The legacy workbook did take the first
 * match; those collisions were resolved once, during migration, and recorded in
 * the generated config rather than left for the engine to guess at every run.
 */

import type { MappingRule, MappedEntry, MappingOutcome, TrialBalanceRow } from "../types";
import { baseGlCodeAsNumber, type NormalizedAccount } from "../accounts/normalizeAccount";

/** Lower number wins. */
export function matchPrecedence(matchType: MappingRule["matchType"]): number {
  switch (matchType) {
    case "EXACT_FULL_CODE":
      return 1;
    case "BASE_GL_CODE":
    case "GL_CODE_SET":
      return 2;
    case "NUMERIC_RANGE":
      return 3;
  }
}

/**
 * Does this rule claim this account?
 *
 * EXACT_FULL_CODE compares the whole normalized code. It is not a prefix test:
 * a rule for "3100-K-I" does not absorb a future "3100-K-I-002", which would
 * instead surface as an unmapped account for a human to place. Silently
 * swallowing an unknown sub-account is exactly the failure this tool exists to
 * prevent.
 */
export function ruleMatches(rule: MappingRule, account: NormalizedAccount): boolean {
  if (rule.status !== "active") return false;
  if (rule.role === "current_period_earnings") return false; // control-only

  switch (rule.matchType) {
    case "EXACT_FULL_CODE":
      return rule.fullCode === account.normalizedFullCode;

    case "BASE_GL_CODE":
      return rule.baseCode === account.baseGlCode;

    case "GL_CODE_SET":
      return (rule.accounts ?? []).includes(account.baseGlCode);

    case "NUMERIC_RANGE": {
      const value = baseGlCodeAsNumber(account);
      if (value === null) return false;
      return value >= (rule.from ?? 0) && value <= (rule.to ?? 0);
    }
  }
}

/** Two rules agree when they would place the account identically. */
function rulesAgree(a: MappingRule, b: MappingRule): boolean {
  return (
    a.excluded === b.excluded &&
    a.statement === b.statement &&
    a.statementLine === b.statementLine &&
    a.section === b.section &&
    a.category === b.category
  );
}

export interface Resolution {
  outcome: MappingOutcome;
  rule: MappingRule | null;
  /** Every rule that claimed the account, across all tiers. */
  candidates: MappingRule[];
  /** Rules that tied at the winning tier and disagreed. */
  conflicting: MappingRule[];
}

/**
 * Resolve one account against the whole active rule set, both statements at
 * once. A correctly built table claims each account exactly once.
 */
export function resolveAccount(
  rules: readonly MappingRule[],
  account: NormalizedAccount
): Resolution {
  const candidates = rules.filter((rule) => ruleMatches(rule, account));
  if (candidates.length === 0) {
    return { outcome: "unmapped", rule: null, candidates: [], conflicting: [] };
  }

  const bestTier = Math.min(...candidates.map((r) => matchPrecedence(r.matchType)));
  const winners = candidates.filter((r) => matchPrecedence(r.matchType) === bestTier);

  const disagreeing = winners.filter((r) => !rulesAgree(r, winners[0]));
  if (disagreeing.length > 0) {
    return { outcome: "ambiguous", rule: null, candidates, conflicting: winners };
  }

  const rule = winners[0];
  return {
    outcome: rule.excluded ? "excluded" : "mapped",
    rule,
    candidates,
    conflicting: [],
  };
}

/** Apply the mapping table to every Trial Balance row. */
export function applyMappings(
  rows: readonly TrialBalanceRow[],
  rules: readonly MappingRule[]
): MappedEntry[] {
  return rows.map((row) => {
    const resolution = resolveAccount(rules, row.account);
    return {
      row,
      outcome: resolution.outcome,
      rule: resolution.rule,
      candidates: resolution.outcome === "ambiguous" ? resolution.conflicting : resolution.candidates,
    };
  });
}
