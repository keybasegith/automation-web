/**
 * Accounting validations.
 *
 * Each function reports what it found and changes nothing. No validation ever
 * repairs a statement: an out-of-balance sheet is surfaced with its exact
 * difference, never closed with a balancing entry.
 */

import type {
  BalanceSheetValidation,
  GeneratedBalanceSheet,
  GeneratedIncomeStatement,
  IncomeStatementValidation,
  MappedEntry,
  ParsedTrialBalance,
  ReconciliationReport,
  StatementNode,
  TraceabilityFailure,
  TrialBalanceValidation,
} from "../types";
import { sumCents } from "../money";

export function validateTrialBalance(parsed: ParsedTrialBalance): TrialBalanceValidation {
  const differenceCents = parsed.totalDebitsCents - parsed.totalCreditsCents;
  return {
    totalDebitsCents: parsed.totalDebitsCents,
    totalCreditsCents: parsed.totalCreditsCents,
    differenceCents,
    isBalanced: differenceCents === 0n,
    rowCount: parsed.rows.length,
    malformedRowCount: parsed.malformedRows.length,
  };
}

export function validateBalanceSheet(balanceSheet: GeneratedBalanceSheet): BalanceSheetValidation {
  const { totalAssetsCents, totalLiabilitiesAndEquityCents, differenceCents } = balanceSheet.totals;
  return {
    totalAssetsCents,
    totalLiabilitiesAndEquityCents,
    differenceCents,
    isBalanced: differenceCents === 0n,
  };
}

/**
 * Prove the Income Statement's net income against the same figure re-derived
 * straight from the mapped rows. The two are computed by different routes — one
 * through the presentation tree, one by summing the underlying balances — so
 * agreement is meaningful.
 */
export function validateIncomeStatement(
  incomeStatement: GeneratedIncomeStatement,
  crossCheckCents: bigint
): IncomeStatementValidation {
  return {
    netIncomeCents: incomeStatement.totals.netIncomeCents,
    crossCheckCents,
    reconciles: incomeStatement.totals.netIncomeCents === crossCheckCents,
  };
}

/**
 * Every presented line must equal the sum of the Trial Balance rows behind it.
 * This is what makes the drill-down trustworthy rather than decorative.
 */
export function checkTraceability(nodes: readonly StatementNode[]): TraceabilityFailure[] {
  const failures: TraceabilityFailure[] = [];

  for (const node of nodes) {
    if (node.kind !== "line" || !node.sourceRows) continue;
    const sourceSumCents = sumCents(node.sourceRows.map((r) => r.presentedCents));
    if (sourceSumCents !== (node.amountCents ?? 0n)) {
      failures.push({
        nodeId: node.id,
        label: node.label,
        amountCents: node.amountCents ?? 0n,
        sourceSumCents,
      });
    }
  }

  return failures;
}

/**
 * Where every dollar went. Each Trial Balance row lands in exactly one bucket;
 * there is deliberately no bucket for "other", which is how a row that nothing
 * claimed becomes visible instead of vanishing.
 */
export function buildReconciliation(entries: readonly MappedEntry[]): ReconciliationReport {
  const bucket = (predicate: (e: MappedEntry) => boolean) =>
    sumCents(entries.filter(predicate).map((e) => e.row.netCents));

  const balanceSheetCents = bucket(
    (e) => e.outcome === "mapped" && e.rule?.statement === "balance_sheet"
  );
  const incomeStatementCents = bucket(
    (e) => e.outcome === "mapped" && e.rule?.statement === "income_statement"
  );
  const excludedCents = bucket((e) => e.outcome === "excluded");
  const unmappedCents = bucket((e) => e.outcome === "unmapped");
  const ambiguousCents = bucket((e) => e.outcome === "ambiguous");

  const accountedCents =
    balanceSheetCents + incomeStatementCents + excludedCents + unmappedCents + ambiguousCents;
  const trialBalanceNetCents = sumCents(entries.map((e) => e.row.netCents));

  const counts = { mapped: 0, excluded: 0, unmapped: 0, ambiguous: 0 };
  for (const entry of entries) counts[entry.outcome] += 1;

  return {
    rowCount: entries.length,
    balanceSheetCents,
    incomeStatementCents,
    excludedCents,
    unmappedCents,
    ambiguousCents,
    accountedCents,
    trialBalanceNetCents,
    isComplete:
      accountedCents === trialBalanceNetCents &&
      counts.mapped + counts.excluded + counts.unmapped + counts.ambiguous === entries.length,
    counts,
  };
}
