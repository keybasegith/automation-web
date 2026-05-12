import { NextResponse } from "next/server";
import { buildMonthlyAnalysis } from "@/lib/finance-intelligence/buildMonthlyAnalysis";
import type {
  AccountPreview,
  AccountSummary,
  SageAccount,
} from "@/lib/finance-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  account?: unknown;
  fiscalYear?: number;
  fiscalPeriod?: string;
  asAtDate?: string;
}

function validateAccount(value: unknown):
  | { ok: true; account: SageAccount }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "account is required." };
  }
  const a = value as Record<string, unknown>;
  if (typeof a.accountNumber !== "string" || !a.accountNumber.trim()) {
    return { ok: false, error: "account.accountNumber is required." };
  }
  if (typeof a.accountNumberRaw !== "string") {
    return { ok: false, error: "account.accountNumberRaw is required." };
  }
  if (typeof a.accountName !== "string") {
    return { ok: false, error: "account.accountName is required." };
  }
  if (!Array.isArray(a.transactions)) {
    return { ok: false, error: "account.transactions must be an array." };
  }
  // Defensive cap so a malformed/oversized payload can't run away with us.
  if (a.transactions.length > 200_000) {
    return { ok: false, error: "account.transactions is too large." };
  }
  return { ok: true, account: value as SageAccount };
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateAccount(body.account);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const account = validated.account;

  const fiscalYear =
    body.fiscalYear ?? account.fiscalYear ?? new Date().getFullYear();
  const fiscalPeriod = body.fiscalPeriod ?? "12";

  const analysis = buildMonthlyAnalysis({
    account,
    fiscalYear,
    fiscalPeriod,
    asAtDate: body.asAtDate,
  });

  let latestTransactionDate: string | undefined;
  for (const t of account.transactions) {
    if (!t.docDate) continue;
    if (!latestTransactionDate || t.docDate > latestTransactionDate) {
      latestTransactionDate = t.docDate;
    }
  }

  const summary: AccountSummary = {
    accountNumber: account.accountNumber,
    accountNumberRaw: account.accountNumberRaw,
    accountName: account.accountName,
    fiscalYear: account.fiscalYear,
    transactionCount: account.transactions.length,
    openingBalance: account.openingBalance,
    endingBalance: account.endingBalance,
    latestTransactionDate,
  };

  const preview: AccountPreview = {
    account: summary,
    rows: account.transactions.map((t) => ({
      rowIndex: t.rawRowIndex,
      date: t.docDate,
      source: t.source,
      description: t.description,
      reference: t.reference,
      batchEntry: t.batchEntry,
      debit: t.debit,
      credit: t.credit,
      netChange: t.netChange,
      balance: t.balance,
    })),
    warnings: analysis.warnings,
    generatedEndingBalance: analysis.generatedEndingBalance,
    sageEndingBalance: analysis.sageEndingBalance,
    difference: analysis.difference,
    validationStatus: analysis.validationStatus,
  };

  return NextResponse.json({ preview, analysis });
}
