import { NextResponse } from "next/server";
import { buildMonthlyAnalysis } from "@/lib/finance-intelligence/buildMonthlyAnalysis";
import {
  buildDownloadFilename,
  generateMonthlyAnalysisWorkbook,
} from "@/lib/finance-intelligence/generateMonthlyAnalysisWorkbook";
import type { SageAccount } from "@/lib/finance-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  if (!body.fiscalYear || !Number.isFinite(body.fiscalYear)) {
    return NextResponse.json(
      { error: "fiscalYear is required." },
      { status: 400 }
    );
  }
  if (!body.fiscalPeriod || typeof body.fiscalPeriod !== "string") {
    return NextResponse.json(
      { error: "fiscalPeriod is required." },
      { status: 400 }
    );
  }

  const analysis = buildMonthlyAnalysis({
    account,
    fiscalYear: body.fiscalYear,
    fiscalPeriod: body.fiscalPeriod,
    asAtDate: body.asAtDate,
  });

  const filename = buildDownloadFilename(analysis);

  let buffer: Buffer;
  try {
    buffer = await generateMonthlyAnalysisWorkbook(analysis);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to generate Excel workbook.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  // Copy into a fresh Uint8Array so the Response body type is unambiguous
  // (Buffer.buffer can be SharedArrayBuffer under newer Node typings).
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Validation-Status": analysis.validationStatus,
      "X-Generated-Ending-Balance": String(analysis.generatedEndingBalance),
      ...(analysis.sageEndingBalance !== undefined && {
        "X-Sage-Ending-Balance": String(analysis.sageEndingBalance),
      }),
      ...(analysis.difference !== undefined && {
        "X-Difference": String(analysis.difference),
      }),
    },
  });
}
