/** Builders for synthetic Trial Balances, so engine tests need no fixture. */

import { normalizeAccountCode } from "../accounts/normalizeAccount";
import type { MappingRule, ParsedTrialBalance, TrialBalanceRow } from "../types";

export function row(
  accountCode: string,
  description: string,
  debit: number,
  credit: number,
  sourceRowNumber = 1
): TrialBalanceRow {
  const account = normalizeAccountCode(accountCode);
  if (!account) throw new Error(`Test used an invalid account code: ${accountCode}`);
  const debitCents = BigInt(Math.round(debit * 100));
  const creditCents = BigInt(Math.round(credit * 100));
  return {
    sourceRowNumber, account, description, debitCents, creditCents,
    netCents: debitCents - creditCents,
  };
}

export function trialBalance(rows: TrialBalanceRow[]): ParsedTrialBalance {
  let totalDebitsCents = 0n;
  let totalCreditsCents = 0n;
  for (const r of rows) {
    totalDebitsCents += r.debitCents;
    totalCreditsCents += r.creditCents;
  }
  return {
    fileType: "xlsx", sheetName: "Sheet1", headerRowNumber: 1,
    columnMap: { account: 0, description: 1, debit: 2, credit: 3 },
    rows, malformedRows: [],
    totalDebitsCents, totalCreditsCents,
    reportedTotalDebitsCents: null, reportedTotalCreditsCents: null,
    reportedNetIncomeCents: null, detectedPeriodLabel: null,
  };
}

export function rule(partial: Partial<MappingRule> & Pick<MappingRule, "id" | "matchType">): MappingRule {
  return {
    statement: "balance_sheet",
    category: "Assets",
    section: "Current assets",
    statementLine: "Cash",
    status: "active",
    excluded: false,
    source: "user",
    ...partial,
  } as MappingRule;
}
