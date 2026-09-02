/**
 * The calculation engine.
 *
 * This is the only place statements are produced. The workspace UI, the Excel
 * export and the regression tests all read the result of this one function —
 * there is no second calculator anywhere, so an exported figure cannot disagree
 * with the figure that was reviewed on screen.
 *
 * Pure and deterministic: same Trial Balance plus same mapping table gives the
 * same statements, validations and exceptions every time. No I/O, no clock, no
 * randomness, no model call.
 */

import type {
  FinalizationReadiness,
  FinancialException,
  GeneratedBalanceSheet,
  GeneratedIncomeStatement,
  MappedEntry,
  MappingRule,
  ParsedTrialBalance,
  ReconciliationReport,
  StatementNode,
  StatementStatus,
  TraceabilityFailure,
  BalanceSheetValidation,
  IncomeStatementValidation,
  TrialBalanceValidation,
} from "../types";
import { applyMappings } from "../mapping/resolveMapping";
import { ENTITY_NAME } from "../config/statementPresentation";
import { crossCheckNetIncome, generateIncomeStatement } from "./incomeStatement";
import { generateBalanceSheet } from "./balanceSheet";
import {
  buildReconciliation,
  checkTraceability,
  validateBalanceSheet,
  validateIncomeStatement,
  validateTrialBalance,
} from "../validation/validate";
import { blockingExceptions, buildExceptions } from "../validation/exceptions";

export interface GenerateStatementsInput {
  parsed: ParsedTrialBalance;
  rules: readonly MappingRule[];
  periodLabel: string;
  entityName?: string;
}

export interface GenerateStatementsResult {
  entries: MappedEntry[];
  incomeStatement: GeneratedIncomeStatement;
  balanceSheet: GeneratedBalanceSheet;
  trialBalanceValidation: TrialBalanceValidation;
  balanceSheetValidation: BalanceSheetValidation;
  incomeStatementValidation: IncomeStatementValidation;
  traceabilityFailures: TraceabilityFailure[];
  reconciliation: ReconciliationReport;
  exceptions: FinancialException[];
  readiness: FinalizationReadiness;
  status: StatementStatus;
}

export function generateStatements(input: GenerateStatementsInput): GenerateStatementsResult {
  const entityName = input.entityName ?? ENTITY_NAME;
  const entries = applyMappings(input.parsed.rows, input.rules);

  const trialBalanceValidation = validateTrialBalance(input.parsed);

  // Income Statement first: the Balance Sheet presents its net income and must
  // not derive that figure a second time.
  const incomeStatement = generateIncomeStatement({
    entityName,
    periodLabel: input.periodLabel,
    entries,
  });

  const balanceSheet = generateBalanceSheet({
    entityName,
    periodLabel: input.periodLabel,
    entries,
    netIncomeCents: incomeStatement.totals.netIncomeCents,
  });

  const balanceSheetValidation = validateBalanceSheet(balanceSheet);
  const incomeStatementValidation = validateIncomeStatement(
    incomeStatement,
    crossCheckNetIncome(entries)
  );

  const traceabilityFailures = [
    ...checkTraceability(incomeStatement.nodes),
    ...checkTraceability(balanceSheet.nodes),
  ];
  const reconciliation = buildReconciliation(entries);

  const exceptions = buildExceptions({
    entries,
    malformedRows: input.parsed.malformedRows,
    trialBalance: trialBalanceValidation,
    balanceSheet,
    balanceSheetValidation,
    incomeStatement,
    incomeStatementValidation,
    traceabilityFailures,
    reconciliation,
  });

  const readiness = assessFinalization({
    trialBalanceValidation,
    balanceSheetValidation,
    incomeStatementValidation,
    traceabilityFailures,
    reconciliation,
    entries,
    exceptions,
  });

  return {
    entries,
    incomeStatement,
    balanceSheet,
    trialBalanceValidation,
    balanceSheetValidation,
    incomeStatementValidation,
    traceabilityFailures,
    reconciliation,
    exceptions,
    readiness,
    status: readiness.noBlockingExceptions ? "ready" : "requires_review",
  };
}

export interface AssessFinalizationInput {
  trialBalanceValidation: TrialBalanceValidation;
  balanceSheetValidation: BalanceSheetValidation;
  incomeStatementValidation: IncomeStatementValidation;
  traceabilityFailures: readonly TraceabilityFailure[];
  reconciliation: ReconciliationReport;
  entries: readonly MappedEntry[];
  exceptions: readonly FinancialException[];
}

/** The finalization gate, as explicit pass/fail checks. */
export function assessFinalization(input: AssessFinalizationInput): FinalizationReadiness {
  const checks = {
    trialBalanceBalanced: input.trialBalanceValidation.isBalanced,
    allAccountsMapped: input.reconciliation.counts.unmapped === 0,
    noAmbiguousMappings: input.reconciliation.counts.ambiguous === 0,
    balanceSheetBalanced: input.balanceSheetValidation.isBalanced,
    netIncomeReconciles: input.incomeStatementValidation.reconciles,
    traceabilityPasses: input.traceabilityFailures.length === 0,
    reconciliationComplete: input.reconciliation.isComplete,
    noBlockingExceptions: blockingExceptions(input.exceptions).length === 0,
  };

  return { ...checks, canFinalize: Object.values(checks).every(Boolean) };
}

/** Re-derive status after exception statuses change, without regenerating. */
export function deriveStatus(
  exceptions: readonly FinancialException[],
  currentStatus: StatementStatus
): StatementStatus {
  if (currentStatus === "finalized") return "finalized";
  return blockingExceptions(exceptions).length > 0 ? "requires_review" : "ready";
}

/**
 * Every Trial Balance row behind one statement line — the drill-down behind
 * "[View source accounts]".
 */
export function getLineTrace(
  result: Pick<GenerateStatementsResult, "balanceSheet" | "incomeStatement">,
  nodeId: string
): StatementNode | null {
  const all = [...result.balanceSheet.nodes, ...result.incomeStatement.nodes];
  return all.find((node) => node.id === nodeId) ?? null;
}

/** The full active rule set: both statements, in a stable order. */
export function allMappingRules(
  balanceSheet: readonly MappingRule[],
  incomeStatement: readonly MappingRule[]
): MappingRule[] {
  return [...balanceSheet, ...incomeStatement];
}
