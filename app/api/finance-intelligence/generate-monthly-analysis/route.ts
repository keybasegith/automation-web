import { NextResponse } from "next/server";
import { buildMonthlyAnalysis } from "@/lib/finance-intelligence/buildMonthlyAnalysis";
import {
  buildDownloadFilename,
  generateMonthlyAnalysisWorkbook,
} from "@/lib/finance-intelligence/generateMonthlyAnalysisWorkbook";
import { getParsedExport } from "@/lib/finance-intelligence/tempStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
