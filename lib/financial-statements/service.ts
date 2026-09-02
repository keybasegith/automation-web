/**
 * Application service.
 *
 * Sits between the HTTP routes and the engine: it decides what gets stored,
 * what gets audited and what a caller is allowed to do. All arithmetic stays in
 * the engine — nothing here computes a statement figure.
 */

import type {
  ExceptionStatus,
  MappingRule,
  ParsedTrialBalance,
  StatementPackage,
  TrialBalanceFileType,
} from "./types";
import { store } from "./repo";
import type { StatementVersion } from "./store/types";
import { parseTrialBalanceFile } from "./parsers/parseTrialBalance";
import { deriveStatus, generateStatements, type GenerateStatementsResult } from "./engine/generateStatements";
import { ENTITY_NAME } from "./config/statementPresentation";
import { validateMappings } from "./mapping/validateMappings";
import type { FinanceActor } from "./roles";

/** Sage prints "2026-07-31"; the statements read better as "July 2026". */
export function toPeriodLabel(detected: string | null, fallbackFileName: string): string {
  if (detected) {
    const iso = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(detected);
    if (iso) {
      const date = new Date(Number(iso[1]), Number(iso[2]) - 1, 1);
      return `${date.toLocaleString("en-US", { month: "long" })} ${iso[1]}`;
    }
    return detected;
  }
  const fromName = /(\d{4})[-_ ]?(\d{2})/.exec(fallbackFileName);
  if (fromName) {
    const date = new Date(Number(fromName[1]), Number(fromName[2]) - 1, 1);
    return `${date.toLocaleString("en-US", { month: "long" })} ${fromName[1]}`;
  }
  return "Current period";
}

function fiscalYearFrom(periodLabel: string, detected: string | null): number {
  const year = /(\d{4})/.exec(detected ?? periodLabel)?.[1];
  return year ? Number(year) : new Date().getFullYear();
}

export interface UploadResult {
  statementPackage: StatementPackage;
  parsed: ParsedTrialBalance;
  version: StatementVersion;
}

/**
 * Parse an uploaded Trial Balance, create a package and generate version 1.
 * The uploaded bytes are not retained — only the normalized rows and result.
 */
export async function uploadTrialBalance(
  buffer: Buffer,
  fileName: string,
  actor: FinanceActor
): Promise<UploadResult> {
  const parsed = parseTrialBalanceFile(buffer, fileName);
  const periodLabel = toPeriodLabel(parsed.detectedPeriodLabel, fileName);
  const rules = await store.listMappings();
  const mappingVersion = await store.mappingVersion();

  const statementPackage = await store.createPackage({
    entityName: ENTITY_NAME,
    periodLabel,
    fiscalYear: fiscalYearFrom(periodLabel, parsed.detectedPeriodLabel),
    sourceFileName: fileName,
    sourceFileType: parsed.fileType as TrialBalanceFileType,
    sourceFileSizeBytes: buffer.byteLength,
    mappingVersion,
    actor: actor.id,
  });

  await store.appendAudit({
    packageId: statementPackage.id,
    type: "trial_balance_uploaded",
    actor: actor.name,
    at: new Date().toISOString(),
    summary: `Uploaded ${fileName} (${parsed.rows.length} rows).`,
    detail: { fileType: parsed.fileType, rows: parsed.rows.length, malformed: parsed.malformedRows.length },
  });
  await store.appendAudit({
    packageId: statementPackage.id,
    type: "parsing_completed",
    actor: actor.name,
    at: new Date().toISOString(),
    summary: `Read ${parsed.rows.length} rows from row ${parsed.headerRowNumber + 1} onwards.`,
  });

  const version = await generateAndStore(statementPackage.id, parsed, rules, mappingVersion, actor, 1);
  const refreshed = await store.getPackage(statementPackage.id);

  return { statementPackage: refreshed ?? statementPackage, parsed, version };
}

async function generateAndStore(
  packageId: string,
  parsed: ParsedTrialBalance,
  rules: readonly MappingRule[],
  mappingVersion: string,
  actor: FinanceActor,
  versionNumber: number
): Promise<StatementVersion> {
  const found = await store.getPackage(packageId);
  const result = generateStatements({
    parsed,
    rules,
    periodLabel: found?.periodLabel ?? "Current period",
    entityName: found?.entityName ?? ENTITY_NAME,
  });

  const version = await store.saveVersion({
    packageId,
    version: versionNumber,
    createdAt: new Date().toISOString(),
    createdBy: actor.name,
    mappingVersion,
    result,
  });

  await store.setPackageStatus(packageId, result.status, actor.id);
  await store.appendAudit({
    packageId,
    type: versionNumber === 1 ? "statements_generated" : "statements_regenerated",
    actor: actor.name,
    at: version.createdAt,
    summary: `Generated version ${versionNumber} using mapping ${mappingVersion}. Status: ${result.status}.`,
    detail: {
      netIncomeCents: result.incomeStatement.totals.netIncomeCents.toString(),
      totalAssetsCents: result.balanceSheet.totals.totalAssetsCents.toString(),
      blockingExceptions: result.exceptions.filter((e) => e.severity === "blocking").length,
    },
  });

  return version;
}

/**
 * Regenerate from the stored rows against the current mapping table, as a new
 * version. A finalized package is never silently rewritten.
 */
export async function regeneratePackage(
  packageId: string,
  actor: FinanceActor
): Promise<StatementVersion | null> {
  const [found, latest] = await Promise.all([
    store.getPackage(packageId),
    store.getLatestVersion(packageId),
  ]);
  if (!found || !latest) return null;
  if (found.status === "finalized") {
    throw new Error("This package is finalized. Reopen it before regenerating.");
  }

  const rules = await store.listMappings();
  const mappingVersion = await store.mappingVersion();

  // The stored rows are the source; the upload itself was never retained.
  const parsed = rebuildParsed(latest);
  return generateAndStore(packageId, parsed, rules, mappingVersion, actor, latest.version + 1);
}

/** Reconstruct the parse result from a stored version's rows. */
function rebuildParsed(version: StatementVersion): ParsedTrialBalance {
  const rows = version.result.entries.map((e) => e.row);
  let totalDebitsCents = 0n;
  let totalCreditsCents = 0n;
  for (const row of rows) {
    totalDebitsCents += row.debitCents;
    totalCreditsCents += row.creditCents;
  }
  return {
    fileType: "xlsx",
    sheetName: "stored",
    headerRowNumber: 0,
    columnMap: { account: 0, description: 1, debit: 2, credit: 3 },
    rows,
    malformedRows: [],
    totalDebitsCents,
    totalCreditsCents,
    reportedTotalDebitsCents: null,
    reportedTotalCreditsCents: null,
    reportedNetIncomeCents: null,
    detectedPeriodLabel: null,
  };
}

export async function resolveException(
  packageId: string,
  exceptionId: string,
  status: ExceptionStatus,
  actor: FinanceActor,
  note?: string
) {
  const updated = await store.setExceptionStatus(packageId, exceptionId, status, actor.name, note);
  if (!updated) return null;

  const latest = await store.getLatestVersion(packageId);
  const found = await store.getPackage(packageId);
  if (latest && found && found.status !== "finalized") {
    await store.setPackageStatus(packageId, deriveStatus(latest.result.exceptions, found.status), actor.id);
  }

  await store.appendAudit({
    packageId,
    type: "exception_resolved",
    actor: actor.name,
    at: new Date().toISOString(),
    summary: `Exception ${exceptionId} marked ${status}.`,
    detail: note ? { note } : undefined,
  });

  return updated;
}

export async function finalizePackage(packageId: string, actor: FinanceActor) {
  const [found, latest] = await Promise.all([
    store.getPackage(packageId),
    store.getLatestVersion(packageId),
  ]);
  if (!found || !latest) return null;

  const readiness = latest.result.readiness;
  if (!readiness.canFinalize) {
    const failed = Object.entries(readiness)
      .filter(([key, value]) => key !== "canFinalize" && value === false)
      .map(([key]) => key);
    throw new Error(`This package cannot be finalized yet: ${failed.join(", ")}.`);
  }

  const updated = await store.setPackageStatus(packageId, "finalized", actor.id);
  await store.appendAudit({
    packageId,
    type: "package_finalized",
    actor: actor.name,
    at: new Date().toISOString(),
    summary: `Finalized version ${latest.version}.`,
  });
  return updated;
}

export async function reopenPackage(packageId: string, actor: FinanceActor) {
  const latest = await store.getLatestVersion(packageId);
  if (!latest) return null;
  const updated = await store.setPackageStatus(
    packageId,
    deriveStatus(latest.result.exceptions, "ready"),
    actor.id
  );
  await store.appendAudit({
    packageId,
    type: "package_reopened",
    actor: actor.name,
    at: new Date().toISOString(),
    summary: "Reopened for editing.",
  });
  return updated;
}

export async function saveMappingTable(rules: readonly MappingRule[], actor: FinanceActor) {
  const validation = validateMappings(rules);
  if (!validation.isValid) return { validation, rules: null };
  const saved = await store.replaceMappings(rules);
  await store.appendAudit({
    packageId: null,
    type: "mapping_imported",
    actor: actor.name,
    at: new Date().toISOString(),
    summary: `Replaced the mapping table with ${saved.length} rules.`,
  });
  return { validation, rules: saved };
}

export interface PackageView {
  statementPackage: StatementPackage;
  version: StatementVersion;
  result: GenerateStatementsResult;
}

export async function loadPackage(packageId: string): Promise<PackageView | null> {
  const [statementPackage, version] = await Promise.all([
    store.getPackage(packageId),
    store.getLatestVersion(packageId),
  ]);
  if (!statementPackage || !version) return null;
  return { statementPackage, version, result: version.result };
}
