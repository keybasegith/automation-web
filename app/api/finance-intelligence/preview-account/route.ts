import { NextResponse } from "next/server";
import { buildMonthlyAnalysis } from "@/lib/finance-intelligence/buildMonthlyAnalysis";
import { getParsedExport } from "@/lib/finance-intelligence/tempStore";
import type {
  AccountPreview,
  AccountSummary,
} from "@/lib/finance-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  uploadSessionId?: string;
  accountNumber?: string;
  fiscalYear?: number;
  fiscalPeriod?: string;
  asAtDate?: string;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.uploadSessionId || typeof body.uploadSessionId !== "string") {
    return NextResponse.json(
      { error: "uploadSessionId is required." },
      { status: 400 }
    );
  }
  if (!body.accountNumber || typeof body.accountNumber !== "string") {
    return NextResponse.json(
      { error: "accountNumber is required." },
      { status: 400 }
    );
  }

  const parsed = getParsedExport(body.uploadSessionId);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Upload session not found or expired. Please re-upload the Sage 300 file.",
      },
      { status: 404 }
    );
  }

  const account = parsed.accounts.find(
    (a) => a.accountNumber === body.accountNumber
  );
  if (!account) {
    return NextResponse.json(
      { error: `Account ${body.accountNumber} not found in this upload.` },
      { status: 404 }
    );
  }

  const fiscalYear =
    body.fiscalYear ??
    account.fiscalYear ??
    parsed.detectedFiscalYears[parsed.detectedFiscalYears.length - 1] ??
    new Date().getFullYear();
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
