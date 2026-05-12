import { NextResponse } from "next/server";
import { buildMonthlyAnalysis } from "@/lib/finance-intelligence/buildMonthlyAnalysis";
import {
  buildAllAccountsDownloadFilename,
  generateAllAccountsWorkbook,
} from "@/lib/finance-intelligence/generateMonthlyAnalysisWorkbook";
import type { SageAccount } from "@/lib/finance-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface RequestBody {
  accounts?: unknown;
  fiscalYear?: number;
  fiscalPeriod?: string;
  asAtDate?: string;
}

function validateAccount(value: unknown): value is SageAccount {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.accountNumber === "string" &&
    a.accountNumber.trim().length > 0 &&
    typeof a.accountNumberRaw === "string" &&
    typeof a.accountName === "string" &&
    Array.isArray(a.transactions)
  );
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.accounts) || body.accounts.length === 0) {
    return NextResponse.json(
      { error: "accounts must be a non-empty array." },
      { status: 400 }
    );
  }
  if (body.accounts.length > 500) {
    return NextResponse.json(
      { error: "Too many accounts in a single request (max 500)." },
      { status: 400 }
    );
  }

  const accounts: SageAccount[] = [];
  for (const candidate of body.accounts) {
    if (!validateAccount(candidate)) {
      return NextResponse.json(
        { error: "One or more accounts have an invalid shape." },
        { status: 400 }
      );
    }
    accounts.push(candidate);
  }

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

  const results = accounts.map((account) =>
    buildMonthlyAnalysis({
      account,
      fiscalYear: body.fiscalYear as number,
      fiscalPeriod: body.fiscalPeriod as string,
      asAtDate: body.asAtDate,
    })
  );

  const filename = buildAllAccountsDownloadFilename(
    body.fiscalYear,
    body.fiscalPeriod
  );

  let buffer: Buffer;
  try {
    buffer = await generateAllAccountsWorkbook(results);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to generate combined Excel workbook.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);

  // Surface a brief per-status summary in headers so the client can show a
  // quick toast (e.g. "12 matched / 1 review required").
  let matched = 0;
  let reviewRequired = 0;
  let missing = 0;
  for (const r of results) {
    if (r.validationStatus === "matched") matched += 1;
    else if (r.validationStatus === "review_required") reviewRequired += 1;
    else missing += 1;
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Account-Count": String(results.length),
      "X-Validation-Matched": String(matched),
      "X-Validation-Review-Required": String(reviewRequired),
      "X-Validation-Missing": String(missing),
    },
  });
}
