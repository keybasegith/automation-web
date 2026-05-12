import { NextResponse } from "next/server";
import { parseSageExport } from "@/lib/finance-intelligence/parseSageExport";
import type { SageAccount } from "@/lib/finance-intelligence/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request body must be multipart/form-data with a file field." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field in the upload." },
      { status: 400 }
    );
  }

  if (!hasAcceptedExtension(file.name)) {
    return NextResponse.json(
      {
        error: `Unsupported file type. Accepted: ${ACCEPTED_EXTENSIONS.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_BYTES / (1024 * 1024)} MB limit.` },
      { status: 413 }
    );
  }

  let buffer: Buffer;
  try {
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } catch {
    return NextResponse.json(
      { error: "Could not read uploaded file." },
      { status: 400 }
    );
  }

  let parsed;
  try {
    parsed = parseSageExport(buffer, file.name);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to parse Sage 300 export.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 422 }
    );
  }

  if (parsed.accounts.length === 0) {
    return NextResponse.json(
      {
        error:
          "No accounts were detected in the uploaded file. Confirm this is a Sage 300 General Ledger export.",
      },
      { status: 422 }
    );
  }

  // Stateless: return the full parsed export so the client can hold it in
  // state and echo the selected account back on subsequent calls. Avoids
  // server-side session state that breaks across serverless instances.
  const accounts: SageAccount[] = parsed.accounts;

  return NextResponse.json({
    filename: parsed.filename,
    parsedAt: parsed.parsedAt,
    detectedFiscalYears: parsed.detectedFiscalYears,
    accounts,
  });
}
