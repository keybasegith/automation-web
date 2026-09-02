/**
 * Typed exceptions.
 *
 * An exception describes something a person has to look at. Nothing here
 * repairs data: a blocking exception stops finalization until a human resolves
 * or explicitly accepts it, and the statements keep showing what the Trial
 * Balance and the mapping table actually produced.
 */

import type {
  BalanceSheetValidation,
  ExceptionSeverity,
  FinancialException,
  GeneratedBalanceSheet,
  GeneratedIncomeStatement,
  IncomeStatementValidation,
  MalformedRow,
  MappedEntry,
  ReconciliationReport,
  StatementNode,
  TraceabilityFailure,
  TrialBalanceValidation,
} from "../types";
import { SECTION_NATURAL_BALANCE } from "../config/statementPresentation";
import { formatCents } from "../money";

const money = (cents: bigint) => formatCents(cents, { currency: true, parentheses: true });

interface Draft {
  code: FinancialException["code"];
  severity: ExceptionSeverity;
  title: string;
  detail: string;
  accountCodes?: string[];
  amountCents?: bigint | null;
  idSuffix?: string;
}

const make = (draft: Draft): FinancialException => ({
  id: `${draft.code}${draft.idSuffix ? `:${draft.idSuffix}` : ""}`,
  code: draft.code,
  severity: draft.severity,
  status: "open",
  title: draft.title,
  detail: draft.detail,
  accountCodes: draft.accountCodes ?? [],
  amountCents: draft.amountCents ?? null,
});

export interface BuildExceptionsInput {
  entries: readonly MappedEntry[];
  malformedRows: readonly MalformedRow[];
  trialBalance: TrialBalanceValidation;
  balanceSheet: GeneratedBalanceSheet;
  balanceSheetValidation: BalanceSheetValidation;
  incomeStatement: GeneratedIncomeStatement;
  incomeStatementValidation: IncomeStatementValidation;
  traceabilityFailures: readonly TraceabilityFailure[];
  reconciliation: ReconciliationReport;
}

export function buildExceptions(input: BuildExceptionsInput): FinancialException[] {
  const exceptions: FinancialException[] = [];

  // --- Trial Balance integrity --------------------------------------------
  if (!input.trialBalance.isBalanced) {
    exceptions.push(
      make({
        code: "trial_balance_out_of_balance",
        severity: "blocking",
        title: "Trial Balance does not balance",
        detail:
          `Total debits ${money(input.trialBalance.totalDebitsCents)} do not equal total credits ` +
          `${money(input.trialBalance.totalCreditsCents)}. Difference ` +
          `${money(input.trialBalance.differenceCents)}.`,
        amountCents: input.trialBalance.differenceCents,
      })
    );
  }

  for (const row of input.malformedRows) {
    const isAccountProblem = row.rawAccountCode !== "" && !/amount/i.test(row.reason);
    exceptions.push(
      make({
        code: isAccountProblem ? "invalid_account" : "invalid_amount",
        severity: "blocking",
        title: isAccountProblem
          ? `Row ${row.sourceRowNumber}: account could not be read`
          : `Row ${row.sourceRowNumber}: amount could not be read`,
        detail: `${row.reason} Debit "${row.rawDebit}", credit "${row.rawCredit}".`,
        accountCodes: row.rawAccountCode ? [row.rawAccountCode] : [],
        idSuffix: String(row.sourceRowNumber),
      })
    );
  }

  // --- Duplicate accounts in the source ------------------------------------
  const seen = new Map<string, number[]>();
  for (const entry of input.entries) {
    const code = entry.row.account.normalizedFullCode;
    seen.set(code, [...(seen.get(code) ?? []), entry.row.sourceRowNumber]);
  }
  for (const [code, rowNumbers] of seen) {
    if (rowNumbers.length < 2) continue;
    exceptions.push(
      make({
        code: "duplicate_account",
        severity: "blocking",
        title: `Account ${code} appears ${rowNumbers.length} times`,
        detail:
          `The Trial Balance lists ${code} on rows ${rowNumbers.join(", ")}. ` +
          "Each account must appear once so its balance is unambiguous.",
        accountCodes: [code],
        idSuffix: code,
      })
    );
  }

  // --- Mapping --------------------------------------------------------------
  for (const entry of input.entries) {
    if (entry.outcome === "unmapped") {
      exceptions.push(
        make({
          code: "unmapped_account",
          severity: "blocking",
          title: `${entry.row.account.normalizedFullCode} has no GL mapping`,
          detail:
            `${entry.row.description || "This account"} carries ${money(entry.row.netCents)} and no ` +
            "approved mapping claims it. Add a mapping on the GL Mapping screen; the account stays " +
            "off both statements until one exists.",
          accountCodes: [entry.row.account.normalizedFullCode],
          amountCents: entry.row.netCents,
          idSuffix: entry.row.account.normalizedFullCode,
        })
      );
    }

    if (entry.outcome === "ambiguous") {
      const options = entry.candidates
        .map((rule) => (rule.excluded ? `${rule.id} (excluded)` : `${rule.id} → ${rule.statementLine}`))
        .join("; ");
      exceptions.push(
        make({
          code: "ambiguous_mapping",
          severity: "blocking",
          title: `${entry.row.account.normalizedFullCode} matches conflicting mappings`,
          detail:
            `Equally specific mappings disagree about where this account belongs: ${options}. ` +
            "Nothing is chosen automatically — disable or narrow one of them.",
          accountCodes: [entry.row.account.normalizedFullCode],
          amountCents: entry.row.netCents,
          idSuffix: entry.row.account.normalizedFullCode,
        })
      );
    }

    // An excluded account holding money would quietly unbalance the sheet,
    // because excluded rows reach neither statement.
    if (entry.outcome === "excluded" && entry.row.netCents !== 0n) {
      exceptions.push(
        make({
          code: "excluded_account_has_balance",
          severity: "warning",
          title: `Excluded account ${entry.row.account.normalizedFullCode} is not nil`,
          detail:
            `${entry.row.description || "This account"} carries ${money(entry.row.netCents)} but is ` +
            `deliberately excluded (${entry.rule?.exclusionReason ?? "no reason recorded"}). ` +
            "Excluded balances reach neither statement, so the Balance Sheet will not balance while this stands.",
          accountCodes: [entry.row.account.normalizedFullCode],
          amountCents: entry.row.netCents,
          idSuffix: entry.row.account.normalizedFullCode,
        })
      );
    }
  }

  // --- Statement integrity --------------------------------------------------
  if (!input.balanceSheetValidation.isBalanced) {
    exceptions.push(
      make({
        code: "balance_sheet_out_of_balance",
        severity: "blocking",
        title: "Balance Sheet does not balance",
        detail:
          `Total assets ${money(input.balanceSheetValidation.totalAssetsCents)} do not equal total ` +
          `liabilities and shareholders' equity ` +
          `${money(input.balanceSheetValidation.totalLiabilitiesAndEquityCents)}. Difference ` +
          `${money(input.balanceSheetValidation.differenceCents)}. The difference is reported as found ` +
          "and has not been adjusted.",
        amountCents: input.balanceSheetValidation.differenceCents,
      })
    );
  }

  if (!input.incomeStatementValidation.reconciles) {
    exceptions.push(
      make({
        code: "net_income_reconciliation_error",
        severity: "blocking",
        title: "Net income does not reconcile",
        detail:
          `The Income Statement reports ${money(input.incomeStatementValidation.netIncomeCents)} but the ` +
          `same figure re-derived from the mapped rows is ` +
          `${money(input.incomeStatementValidation.crossCheckCents)}.`,
        amountCents:
          input.incomeStatementValidation.netIncomeCents - input.incomeStatementValidation.crossCheckCents,
      })
    );
  }

  for (const failure of input.traceabilityFailures) {
    exceptions.push(
      make({
        code: "line_traceability_error",
        severity: "blocking",
        title: `"${failure.label}" does not match its source rows`,
        detail:
          `The line shows ${money(failure.amountCents)} but the GL rows behind it total ` +
          `${money(failure.sourceSumCents)}.`,
        amountCents: failure.amountCents - failure.sourceSumCents,
        idSuffix: failure.nodeId,
      })
    );
  }

  if (!input.reconciliation.isComplete) {
    exceptions.push(
      make({
        code: "reconciliation_incomplete",
        severity: "blocking",
        title: "Trial Balance rows are unaccounted for",
        detail:
          `${input.reconciliation.rowCount} rows were read but the buckets total ` +
          `${money(input.reconciliation.accountedCents)} against a Trial Balance net of ` +
          `${money(input.reconciliation.trialBalanceNetCents)}.`,
      })
    );
  }

  // --- Contra balances -----------------------------------------------------
  // Informational: this chart of accounts legitimately carries contra lines
  // (accumulated depreciation, recoveries from reps), so these are surfaced for
  // review rather than treated as errors.
  for (const node of [...input.balanceSheet.nodes, ...input.incomeStatement.nodes]) {
    if (node.kind !== "line" || node.amountCents === null || node.amountCents >= 0n) continue;
    if (!node.sourceRows || node.sourceRows.length === 0) continue;

    const statement = input.balanceSheet.nodes.includes(node) ? input.balanceSheet : input.incomeStatement;
    const natural = naturalBalanceForNode(node, statement.kind);
    exceptions.push(
      make({
        code: natural === "credit" ? "unexpected_debit_balance" : "unexpected_credit_balance",
        severity: "info",
        title: `"${node.label}" carries a contra balance`,
        detail: `The line presents ${money(node.amountCents)}, the opposite of its usual side.`,
        accountCodes: node.sourceRows.map((r) => r.accountCode),
        amountCents: node.amountCents,
        idSuffix: node.id,
      })
    );
  }

  return exceptions;
}

function naturalBalanceForNode(node: StatementNode, kind: "balance_sheet" | "income_statement") {
  const bySection = Object.entries(SECTION_NATURAL_BALANCE).find(([section]) =>
    node.id.includes(section.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
  );
  if (bySection) return bySection[1];
  return kind === "balance_sheet" ? "debit" : "debit";
}

export const blockingExceptions = (exceptions: readonly FinancialException[]): FinancialException[] =>
  exceptions.filter((e) => e.severity === "blocking" && e.status === "open");
