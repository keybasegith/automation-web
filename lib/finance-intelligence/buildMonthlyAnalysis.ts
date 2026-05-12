import { roundCents } from "./parseAmounts";
import type {
  MonthlyAnalysisLine,
  MonthlyAnalysisResult,
  SageAccount,
  SageTransaction,
  ValidationStatus,
} from "./types";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // ISO yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3]);
    const dt = new Date(Date.UTC(y, m, d));
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // mm/dd/yyyy or m/d/yyyy
  const mdy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(trimmed);
  if (mdy) {
    const m = Number(mdy[1]) - 1;
    const d = Number(mdy[2]);
    let y = Number(mdy[3]);
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, m, d));
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // Fallback: native parse
  const dt = new Date(trimmed);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function monthLabelFor(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

function periodEndDate(fiscalYear: number, fiscalPeriod: string): Date {
  // Sage 300 fiscal period is typically a calendar month number "01".."12".
  // For non-numeric values, default to December.
  const periodNum = Number(fiscalPeriod);
  const m = Number.isFinite(periodNum)
    ? Math.min(Math.max(periodNum - 1, 0), 11)
    : 11;
  // Last day of month
  const next = new Date(Date.UTC(fiscalYear, m + 1, 1));
  next.setUTCDate(next.getUTCDate() - 1);
  return next;
}

function formatAsAtDate(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function inferOpeningBalance(
  account: SageAccount,
  asAt: Date,
  includedTxs: SageTransaction[]
): { value: number; inferred: boolean; warning?: string } {
  // 1. Explicit opening balance
  if (account.openingBalance !== undefined) {
    return { value: account.openingBalance, inferred: false };
  }

  // 2. Use balance row immediately before the first included transaction:
  //    balance_before_first - net_change_of_first = opening_balance
  if (includedTxs.length > 0) {
    const first = includedTxs[0];
    const firstNet =
      first.netChange ?? (first.debit ?? 0) - (first.credit ?? 0);
    if (first.balance !== undefined) {
      return {
        value: roundCents(first.balance - firstNet),
        inferred: true,
      };
    }
  }

  // 3. Calculate from prior transactions if any exist before the as-at window.
  const priorTxs = account.transactions.filter((t) => {
    const d = parseDate(t.docDate);
    return d ? d.getTime() < asAt.getTime() && !includedTxs.includes(t) : false;
  });
  if (priorTxs.length > 0) {
    const sum = priorTxs.reduce(
      (s, t) => s + ((t.debit ?? 0) - (t.credit ?? 0)),
      0
    );
    return { value: roundCents(sum), inferred: true };
  }

  return {
    value: 0,
    inferred: true,
    warning:
      "Opening balance could not be detected from the export — defaulted to 0.",
  };
}

function pickAmountForLine(tx: SageTransaction): number {
  // Prefer netChange if Sage provides it (already signed).
  if (tx.netChange !== undefined) return roundCents(tx.netChange);
  const debit = tx.debit ?? 0;
  const credit = tx.credit ?? 0;
  return roundCents(debit - credit);
}

function pickDescription(tx: SageTransaction): string {
  const collapse = (s: string) =>
    s.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  const desc = collapse(tx.description ?? "");
  const ref = collapse(tx.reference ?? "");
  if (desc && ref && !desc.includes(ref) && !ref.includes(desc)) {
    return `${desc} ${ref}`;
  }
  return desc || ref || tx.source || "(no description)";
}

function classifyValidation(
  generated: number,
  sage: number | undefined
): ValidationStatus {
  if (sage === undefined) return "missing_sage_ending_balance";
  return Math.abs(generated - sage) < 0.01 ? "matched" : "review_required";
}

export interface BuildMonthlyAnalysisInput {
  account: SageAccount;
  fiscalYear: number;
  fiscalPeriod: string;
  asAtDate?: string;
}

export function buildMonthlyAnalysis(
  input: BuildMonthlyAnalysisInput
): MonthlyAnalysisResult {
  const warnings: string[] = [];
  const { account, fiscalYear, fiscalPeriod } = input;

  const asAt = input.asAtDate
    ? parseDate(input.asAtDate) ?? periodEndDate(fiscalYear, fiscalPeriod)
    : periodEndDate(fiscalYear, fiscalPeriod);

  const includedTxs = account.transactions
    .filter((t) => {
      const d = parseDate(t.docDate);
      if (!d) return false;
      return d.getTime() <= asAt.getTime();
    })
    .sort((a, b) => {
      const da = parseDate(a.docDate)?.getTime() ?? 0;
      const db = parseDate(b.docDate)?.getTime() ?? 0;
      if (da !== db) return da - db;
      return a.rawRowIndex - b.rawRowIndex;
    });

  if (includedTxs.length === 0) {
    warnings.push(
      "No transactions were found on or before the selected as-at date."
    );
  }

  const opening = inferOpeningBalance(account, asAt, includedTxs);
  if (opening.warning) warnings.push(opening.warning);

  const lines: MonthlyAnalysisLine[] = includedTxs.map((tx) => {
    const txDate = parseDate(tx.docDate);
    const dateLabel = txDate
      ? monthLabelFor(txDate)
      : tx.fiscalPeriod
        ? `Prd ${tx.fiscalPeriod}-${tx.fiscalYear ?? fiscalYear}`
        : "—";
    return {
      dateLabel,
      description: pickDescription(tx),
      amount: pickAmountForLine(tx),
      sourceRowIndex: tx.rawRowIndex,
    };
  });

  const movementSum = lines.reduce((s, l) => s + l.amount, 0);
  const generatedEndingBalance = roundCents(opening.value + movementSum);
  const sageEndingBalance = account.endingBalance;

  if (sageEndingBalance === undefined) {
    warnings.push(
      "Sage 300 ending balance could not be detected — manual validation required."
    );
  }

  const difference =
    sageEndingBalance === undefined
      ? undefined
      : roundCents(generatedEndingBalance - sageEndingBalance);

  const validationStatus = classifyValidation(
    generatedEndingBalance,
    sageEndingBalance
  );

  return {
    accountNumber: account.accountNumber,
    accountNumberRaw: account.accountNumberRaw,
    accountName: account.accountName,
    asAtDate: formatAsAtDate(asAt),
    fiscalYear,
    fiscalPeriod,
    openingBalance: roundCents(opening.value),
    lines,
    generatedEndingBalance,
    sageEndingBalance,
    difference,
    validationStatus,
    warnings,
  };
}

export function buildPreviewRows(account: SageAccount) {
  return account.transactions.map((tx) => ({
    rowIndex: tx.rawRowIndex,
    date: tx.docDate,
    source: tx.source,
    description: tx.description,
    reference: tx.reference,
    batchEntry: tx.batchEntry,
    debit: tx.debit,
    credit: tx.credit,
    netChange: tx.netChange,
    balance: tx.balance,
  }));
}
