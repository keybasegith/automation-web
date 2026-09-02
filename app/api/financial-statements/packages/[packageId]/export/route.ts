/**
 * GET /api/financial-statements/packages/[packageId]/export?scope=&format=
 *
 * scope  = package | balance_sheet | income_statement | trial_balance | exceptions
 * format = xlsx | pdf
 *
 * Both formats render the stored statement version through the same result
 * object, so a downloaded figure always equals the reviewed one.
 */

import { errorResponse } from "@/lib/financial-statements/api";
import { loadPackage } from "@/lib/financial-statements/service";
import { store } from "@/lib/financial-statements/repo";
import { authorize } from "@/lib/financial-statements/roles";
import { buildStatementWorkbook } from "@/lib/financial-statements/exports/excelExporter";
import { buildStatementPdf } from "@/lib/financial-statements/exports/pdfExporter";
import {
  CONTENT_TYPES,
  exportFileName,
  type ExportFormat,
  type ExportScope,
} from "@/lib/financial-statements/exports/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SCOPES: ExportScope[] = ["package", "balance_sheet", "income_statement", "trial_balance", "exceptions"];
const FORMATS: ExportFormat[] = ["xlsx", "pdf"];

export async function GET(request: Request, ctx: { params: Promise<{ packageId: string }> }) {
  try {
    const actor = authorize("export");
    const { packageId } = await ctx.params;

    const params = new URL(request.url).searchParams;
    const scope = (params.get("scope") ?? "package") as ExportScope;
    const format = (params.get("format") ?? "xlsx") as ExportFormat;

    if (!SCOPES.includes(scope)) {
      return Response.json({ error: `scope must be one of ${SCOPES.join(", ")}.` }, { status: 400 });
    }
    if (!FORMATS.includes(format)) {
      return Response.json({ error: `format must be one of ${FORMATS.join(", ")}.` }, { status: 400 });
    }

    const view = await loadPackage(packageId);
    if (!view) return Response.json({ error: "No such statement package." }, { status: 404 });

    if (actor.role === "read_only" && view.statementPackage.status !== "finalized") {
      return Response.json({ error: "Your role can only export finalized statements." }, { status: 403 });
    }

    const input = {
      entityName: view.statementPackage.entityName,
      periodLabel: view.statementPackage.periodLabel,
      sourceFileName: view.statementPackage.sourceFileName,
      generatedAt: view.version.createdAt,
      balanceSheet: view.result.balanceSheet,
      incomeStatement: view.result.incomeStatement,
      entries: view.result.entries,
      exceptions: view.result.exceptions,
      reconciliation: view.result.reconciliation,
    };

    const bytes =
      format === "pdf"
        ? await buildStatementPdf(input, scope)
        : await buildStatementWorkbook(input, scope);

    await store.appendAudit({
      packageId,
      type: "statements_exported",
      actor: actor.name,
      at: new Date().toISOString(),
      summary: `Exported ${scope.replace(/_/g, " ")} as ${format.toUpperCase()} from version ${view.version.version}.`,
      detail: { scope, format, version: view.version.version },
    });

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[format],
        "Content-Disposition": `attachment; filename="${exportFileName(view.statementPackage.periodLabel, scope, format)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
