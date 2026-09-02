/**
 * POST /api/financial-statements/export
 *
 * Stateless export: the Trial Balance comes back with the request, so nothing
 * needs to have been stored. Fields: file, scope, format.
 *
 * This is the path used where the deployment has no writable storage — a
 * serverless function root is read-only. The engine is deterministic and the
 * mapping table is checked-in configuration, so regenerating here produces
 * exactly the statements the workspace displayed.
 */

import { errorResponse } from "@/lib/financial-statements/api";
import { authorize } from "@/lib/financial-statements/roles";
import { store } from "@/lib/financial-statements/repo";
import { parseTrialBalanceFile } from "@/lib/financial-statements/parsers/parseTrialBalance";
import { generateStatements } from "@/lib/financial-statements/engine/generateStatements";
import { ENTITY_NAME } from "@/lib/financial-statements/config/statementPresentation";
import { toPeriodLabel } from "@/lib/financial-statements/service";
import { buildStatementWorkbook } from "@/lib/financial-statements/exports/excelExporter";
import { buildStatementPdf } from "@/lib/financial-statements/exports/pdfExporter";
import {
  CONTENT_TYPES,
  exportFileName,
  type ExportFormat,
  type ExportScope,
} from "@/lib/financial-statements/exports/types";
import { TrialBalanceParseError } from "@/lib/financial-statements/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCOPES: ExportScope[] = ["package", "balance_sheet", "income_statement", "trial_balance", "exceptions"];
const FORMATS: ExportFormat[] = ["xlsx", "pdf"];
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    authorize("export");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Attach the Trial Balance the statements were built from." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return Response.json({ error: "That file is empty or larger than 15 MB." }, { status: 413 });
    }

    const scope = (String(form.get("scope") ?? "package")) as ExportScope;
    const format = (String(form.get("format") ?? "xlsx")) as ExportFormat;
    if (!SCOPES.includes(scope)) {
      return Response.json({ error: `scope must be one of ${SCOPES.join(", ")}.` }, { status: 400 });
    }
    if (!FORMATS.includes(format)) {
      return Response.json({ error: `format must be one of ${FORMATS.join(", ")}.` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseTrialBalanceFile(buffer, file.name);
    const periodLabel = toPeriodLabel(parsed.detectedPeriodLabel, file.name);
    const rules = await store.listMappings();
    const result = generateStatements({ parsed, rules, periodLabel, entityName: ENTITY_NAME });

    const input = {
      entityName: ENTITY_NAME,
      periodLabel,
      sourceFileName: file.name,
      generatedAt: new Date().toISOString(),
      balanceSheet: result.balanceSheet,
      incomeStatement: result.incomeStatement,
      entries: result.entries,
      exceptions: result.exceptions,
      reconciliation: result.reconciliation,
    };

    const bytes =
      format === "pdf"
        ? await buildStatementPdf(input, scope)
        : await buildStatementWorkbook(input, scope);

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[format],
        "Content-Disposition": `attachment; filename="${exportFileName(periodLabel, scope, format)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof TrialBalanceParseError) return errorResponse(error, 422);
    return errorResponse(error, 500);
  }
}
