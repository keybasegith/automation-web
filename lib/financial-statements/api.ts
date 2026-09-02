/**
 * Wire shapes.
 *
 * bigint cannot cross a JSON boundary or a server/client component boundary, so
 * every amount travels as a decimal string of cents plus a pre-formatted
 * display string. Formatting happens once, on the server, from the same cents
 * the Excel export uses — the screen and the workbook cannot drift.
 */

import type {
  FinancialException,
  GeneratedBalanceSheet,
  GeneratedIncomeStatement,
  GeneratedStatement,
  MappedEntry,
  MappingRule,
  ReconciliationReport,
  StatementNode,
  StatementPackage,
  FinalizationReadiness,
  TrialBalanceValidation,
} from "./types";
import type { GenerateStatementsResult } from "./engine/generateStatements";
import { formatCents } from "./money";
import { describeRule, statementLabel } from "./mapping/validateMappings";

const display = (cents: bigint) => formatCents(cents, { parentheses: true });

export interface SourceRowDto {
  accountCode: string;
  description: string;
  cents: string;
  display: string;
}

export interface StatementNodeDto {
  id: string;
  kind: StatementNode["kind"];
  label: string;
  indent: number;
  cents: string | null;
  display: string | null;
  emphasis: StatementNode["emphasis"];
  derived: boolean;
  sourceRows: SourceRowDto[];
}

export interface StatementDto {
  kind: GeneratedStatement["kind"];
  entityName: string;
  title: string;
  periodLabel: string;
  nodes: StatementNodeDto[];
  totals: Record<string, string>;
}

export const toNodeDto = (node: StatementNode): StatementNodeDto => ({
  id: node.id,
  kind: node.kind,
  label: node.label,
  indent: node.indent,
  cents: node.amountCents === null ? null : node.amountCents.toString(),
  display: node.amountCents === null ? null : display(node.amountCents),
  emphasis: node.emphasis,
  derived: node.derived ?? false,
  sourceRows: (node.sourceRows ?? []).map((row) => ({
    accountCode: row.accountCode,
    description: row.description,
    cents: row.presentedCents.toString(),
    display: display(row.presentedCents),
  })),
});

const totalsToStrings = (totals: Record<string, bigint>): Record<string, string> =>
  Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, display(v)]));

export const toStatementDto = (
  statement: GeneratedBalanceSheet | GeneratedIncomeStatement
): StatementDto => ({
  kind: statement.kind,
  entityName: statement.entityName,
  title: statement.title,
  periodLabel: statement.periodLabel,
  nodes: statement.nodes.map(toNodeDto),
  totals: totalsToStrings(statement.totals as unknown as Record<string, bigint>),
});

export interface TrialBalanceRowDto {
  sourceRowNumber: number;
  accountCode: string;
  baseGlCode: string;
  description: string;
  debit: string;
  credit: string;
  net: string;
  outcome: MappedEntry["outcome"];
  statement: string;
  statementLine: string;
  ruleId: string | null;
}

export const toTrialBalanceRowDto = (entry: MappedEntry): TrialBalanceRowDto => ({
  sourceRowNumber: entry.row.sourceRowNumber,
  accountCode: entry.row.account.normalizedFullCode,
  baseGlCode: entry.row.account.baseGlCode,
  description: entry.row.description,
  debit: display(entry.row.debitCents),
  credit: display(entry.row.creditCents),
  net: display(entry.row.netCents),
  outcome: entry.outcome,
  statement: entry.rule ? statementLabel(entry.rule.statement) : "",
  statementLine: entry.rule?.excluded ? "Excluded" : (entry.rule?.statementLine ?? ""),
  ruleId: entry.rule?.id ?? null,
});

export interface ExceptionDto {
  id: string;
  code: FinancialException["code"];
  severity: FinancialException["severity"];
  status: FinancialException["status"];
  title: string;
  detail: string;
  accountCodes: string[];
  amount: string | null;
}

export const toExceptionDto = (exception: FinancialException): ExceptionDto => ({
  id: exception.id,
  code: exception.code,
  severity: exception.severity,
  status: exception.status,
  title: exception.title,
  detail: exception.detail,
  accountCodes: exception.accountCodes,
  amount: exception.amountCents === null ? null : display(exception.amountCents),
});

export interface MappingRuleDto {
  id: string;
  statement: string;
  statementKind: MappingRule["statement"];
  matchType: MappingRule["matchType"];
  rule: string;
  category: string;
  section: string;
  statementLine: string;
  status: MappingRule["status"];
  excluded: boolean;
  exclusionReason: string | null;
  source: MappingRule["source"];
  notes: string | null;
}

export const toMappingDto = (rule: MappingRule): MappingRuleDto => ({
  id: rule.id,
  statement: statementLabel(rule.statement),
  statementKind: rule.statement,
  matchType: rule.matchType,
  rule: describeRule(rule),
  category: rule.category,
  section: rule.section,
  statementLine: rule.excluded ? "" : rule.statementLine,
  status: rule.status,
  excluded: rule.excluded,
  exclusionReason: rule.exclusionReason ?? null,
  source: rule.source,
  notes: rule.notes ?? null,
});

export interface ReconciliationDto {
  rowCount: number;
  balanceSheet: string;
  incomeStatement: string;
  excluded: string;
  unmapped: string;
  ambiguous: string;
  accounted: string;
  trialBalanceNet: string;
  isComplete: boolean;
  counts: ReconciliationReport["counts"];
}

export const toReconciliationDto = (r: ReconciliationReport): ReconciliationDto => ({
  rowCount: r.rowCount,
  balanceSheet: display(r.balanceSheetCents),
  incomeStatement: display(r.incomeStatementCents),
  excluded: display(r.excludedCents),
  unmapped: display(r.unmappedCents),
  ambiguous: display(r.ambiguousCents),
  accounted: display(r.accountedCents),
  trialBalanceNet: display(r.trialBalanceNetCents),
  isComplete: r.isComplete,
  counts: r.counts,
});

export interface TrialBalanceSummaryDto {
  totalDebits: string;
  totalCredits: string;
  difference: string;
  isBalanced: boolean;
  rowCount: number;
  malformedRowCount: number;
}

export const toTrialBalanceSummaryDto = (v: TrialBalanceValidation): TrialBalanceSummaryDto => ({
  totalDebits: display(v.totalDebitsCents),
  totalCredits: display(v.totalCreditsCents),
  difference: display(v.differenceCents),
  isBalanced: v.isBalanced,
  rowCount: v.rowCount,
  malformedRowCount: v.malformedRowCount,
});

export interface PackageDto {
  statementPackage: StatementPackage;
  version: number;
  createdAt: string;
  balanceSheet: StatementDto;
  incomeStatement: StatementDto;
  trialBalance: TrialBalanceSummaryDto;
  rows: TrialBalanceRowDto[];
  exceptions: ExceptionDto[];
  reconciliation: ReconciliationDto;
  readiness: FinalizationReadiness;
  balanceSheetBalanced: boolean;
  netIncome: string;
  /** False when the deployment kept no record of this run. */
  persisted: boolean;
}

export function toPackageDto(
  statementPackage: StatementPackage,
  version: number,
  createdAt: string,
  result: GenerateStatementsResult,
  persisted = true
): PackageDto {
  return {
    statementPackage,
    version,
    createdAt,
    balanceSheet: toStatementDto(result.balanceSheet),
    incomeStatement: toStatementDto(result.incomeStatement),
    trialBalance: toTrialBalanceSummaryDto(result.trialBalanceValidation),
    rows: result.entries.map(toTrialBalanceRowDto),
    exceptions: result.exceptions.map(toExceptionDto),
    reconciliation: toReconciliationDto(result.reconciliation),
    readiness: result.readiness,
    balanceSheetBalanced: result.balanceSheetValidation.isBalanced,
    netIncome: display(result.incomeStatement.totals.netIncomeCents),
    persisted,
  };
}

export const errorResponse = (error: unknown, status = 400): Response => {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return Response.json({ error: message }, { status });
};
