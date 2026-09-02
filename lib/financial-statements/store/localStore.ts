/**
 * Local JSON store.
 *
 * This is an internal tool run for one entity, so it needs no database: the
 * mapping table, generated statement versions, exception statuses and the audit
 * trail live as JSON under `.data/financial-statements` (gitignored). Writes go
 * to a temporary file and are renamed into place, so an interrupted write
 * cannot leave a half-written ledger behind.
 *
 * The uploaded spreadsheet itself is never stored. Only the normalized rows and
 * the generated results are kept.
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import type {
  AuditEvent,
  ExceptionStatus,
  FinancialException,
  MappingRule,
  MappingStatusFlag,
  StatementPackage,
  StatementStatus,
} from "../types";
import { BALANCE_SHEET_MAPPINGS } from "../config/balanceSheetMappings";
import { INCOME_STATEMENT_MAPPINGS } from "../config/incomeStatementMappings";
import { parse, stringify } from "./serialise";
import type { CreatePackageInput, FinancialStore, StatementVersion } from "./types";

/**
 * Where the store writes.
 *
 * A serverless function root (`/var/task`) is read-only, so the project-local
 * `.data` directory cannot be created there. The temp directory is writable but
 * per-instance and short-lived, which is fine for this tool: a run is
 * self-contained, and callers treat persistence as best-effort rather than
 * depending on it.
 *
 * Resolved once, lazily, so an unwritable location degrades instead of throwing
 * at module load.
 */
let resolvedRoot: string | null | undefined;

function root(): string | null {
  if (resolvedRoot !== undefined) return resolvedRoot;

  // Only a location the operator actually chose counts. The OS temp directory
  // is deliberately NOT a fallback: on serverless it is writable but private to
  // one short-lived instance, so a package written during the upload request is
  // frequently gone by the time the browser asks for it. Storing into it would
  // hand out links that 404 — worse than plainly keeping no history.
  const configured = process.env.FINANCIAL_STATEMENTS_DATA_DIR;
  const candidates = configured ? [configured] : [join(process.cwd(), ".data", "financial-statements")];

  for (const candidate of candidates) {
    try {
      mkdirSync(candidate, { recursive: true });
      resolvedRoot = candidate;
      return resolvedRoot;
    } catch {
      // Try the next location.
    }
  }

  // Nothing is writable. The feature still works; it just keeps no history.
  resolvedRoot = null;
  return resolvedRoot;
}

/** True when this deployment can keep a package between requests. */
export const isPersistenceAvailable = (): boolean => root() !== null;

class NoStorageError extends Error {
  constructor() {
    super("This deployment has no writable storage, so nothing was kept.");
    this.name = "NoStorageError";
  }
}

const ROOT_OR_THROW = (): string => {
  const dir = root();
  if (dir === null) throw new NoStorageError();
  return dir;
};

const paths = {
  mappings: () => join(ROOT_OR_THROW(), "mappings.json"),
  packages: () => join(ROOT_OR_THROW(), "packages.json"),
  audit: () => join(ROOT_OR_THROW(), "audit.json"),
  versions: (packageId: string) => join(ROOT_OR_THROW(), "versions", `${packageId}.json`),
  exceptions: (packageId: string) => join(ROOT_OR_THROW(), "exceptions", `${packageId}.json`),
};

async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!existsSync(path)) return fallback;
  try {
    return parse<T>(await readFile(path, "utf8"));
  } catch {
    // A corrupt file must not be silently replaced with an empty one: a finance
    // tool losing its mapping table quietly is worse than failing loudly.
    throw new Error(`${path} could not be read. Fix or remove the file before continuing.`);
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, stringify(value), "utf8");
  await rename(temporary, path);
}

/** A stable fingerprint of the mapping table, recorded on every package. */
function fingerprint(rules: readonly MappingRule[]): string {
  const canonical = [...rules]
    .map((r) => JSON.stringify(r, Object.keys(r).sort()))
    .sort()
    .join("|");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 12);
}

const SEED: MappingRule[] = [...BALANCE_SHEET_MAPPINGS, ...INCOME_STATEMENT_MAPPINGS];

/**
 * The mapping table ships as checked-in configuration, so it is always
 * available even where nothing can be written. Storage only ever holds edits
 * made through the GL Mapping screen.
 */
async function loadMappings(): Promise<MappingRule[]> {
  if (!isPersistenceAvailable()) return [...SEED];

  try {
    const stored = await readJson<MappingRule[] | null>(paths.mappings(), null);
    if (stored) return stored;
    await writeJson(paths.mappings(), SEED);
  } catch {
    // Unwritable or unreadable: fall back to the shipped table.
  }
  return [...SEED];
}

export const localStore: FinancialStore = {
  async listMappings() {
    return loadMappings();
  },

  async getMapping(id) {
    return (await loadMappings()).find((r) => r.id === id) ?? null;
  },

  async upsertMapping(rule) {
    const rules = await loadMappings();
    const index = rules.findIndex((r) => r.id === rule.id);
    if (index >= 0) rules[index] = rule;
    else rules.push(rule);
    await writeJson(paths.mappings(), rules);
    return rule;
  },

  async setMappingStatus(id, status: MappingStatusFlag) {
    const rules = await loadMappings();
    const rule = rules.find((r) => r.id === id);
    if (!rule) return null;
    rule.status = status;
    await writeJson(paths.mappings(), rules);
    return rule;
  },

  async replaceMappings(rules) {
    const next = [...rules];
    await writeJson(paths.mappings(), next);
    return next;
  },

  async mappingVersion() {
    return fingerprint(await loadMappings());
  },

  async createPackage(input: CreatePackageInput) {
    const packages = await readJson<StatementPackage[]>(paths.packages(), []);
    const now = new Date().toISOString();
    const created: StatementPackage = {
      id: randomUUID(),
      entityName: input.entityName,
      periodLabel: input.periodLabel,
      fiscalYear: input.fiscalYear,
      sourceFileName: input.sourceFileName,
      sourceFileType: input.sourceFileType,
      sourceFileSizeBytes: input.sourceFileSizeBytes,
      status: "requires_review",
      currentVersion: 0,
      mappingVersion: input.mappingVersion,
      createdAt: now,
      updatedAt: now,
      finalizedAt: null,
      finalizedBy: null,
    };
    packages.unshift(created);
    await writeJson(paths.packages(), packages);
    return created;
  },

  async listPackages() {
    if (!isPersistenceAvailable()) return [];
    const packages = await readJson<StatementPackage[]>(paths.packages(), []);
    return packages.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getPackage(id) {
    if (!isPersistenceAvailable()) return null;
    return (await readJson<StatementPackage[]>(paths.packages(), [])).find((p) => p.id === id) ?? null;
  },

  async setPackageStatus(id, status: StatementStatus, actor) {
    const packages = await readJson<StatementPackage[]>(paths.packages(), []);
    const found = packages.find((p) => p.id === id);
    if (!found) return null;
    found.status = status;
    found.updatedAt = new Date().toISOString();
    if (status === "finalized") {
      found.finalizedAt = found.updatedAt;
      found.finalizedBy = actor;
    } else {
      found.finalizedAt = null;
      found.finalizedBy = null;
    }
    await writeJson(paths.packages(), packages);
    return found;
  },

  async deletePackage(id) {
    const packages = await readJson<StatementPackage[]>(paths.packages(), []);
    await writeJson(paths.packages(), packages.filter((p) => p.id !== id));
  },

  async saveVersion(version) {
    const versions = await readJson<StatementVersion[]>(paths.versions(version.packageId), []);
    versions.push(version);
    await writeJson(paths.versions(version.packageId), versions);

    // Exception statuses are held alongside so one can be resolved without
    // regenerating; a fresh generation reseeds them.
    await writeJson(paths.exceptions(version.packageId), version.result.exceptions);

    const packages = await readJson<StatementPackage[]>(paths.packages(), []);
    const found = packages.find((p) => p.id === version.packageId);
    if (found) {
      found.currentVersion = version.version;
      found.mappingVersion = version.mappingVersion;
      found.updatedAt = new Date().toISOString();
      await writeJson(paths.packages(), packages);
    }

    return version;
  },

  async getLatestVersion(packageId) {
    if (!isPersistenceAvailable()) return null;
    const versions = await readJson<StatementVersion[]>(paths.versions(packageId), []);
    if (versions.length === 0) return null;
    const latest = versions.reduce((a, b) => (b.version > a.version ? b : a));
    // Overlay the current exception statuses onto the frozen result.
    const stored = await readJson<FinancialException[]>(paths.exceptions(packageId), []);
    if (stored.length > 0) {
      return { ...latest, result: { ...latest.result, exceptions: stored } };
    }
    return latest;
  },

  async listVersions(packageId) {
    if (!isPersistenceAvailable()) return [];
    const versions = await readJson<StatementVersion[]>(paths.versions(packageId), []);
    return versions.sort((a, b) => b.version - a.version);
  },

  async setExceptionStatus(packageId, exceptionId, status: ExceptionStatus, actor, note) {
    const exceptions = await readJson<FinancialException[]>(paths.exceptions(packageId), []);
    const found = exceptions.find((e) => e.id === exceptionId);
    if (!found) return null;
    found.status = status;
    found.resolvedBy = status === "open" ? undefined : actor;
    found.resolvedAt = status === "open" ? undefined : new Date().toISOString();
    found.resolutionNote = note;
    await writeJson(paths.exceptions(packageId), exceptions);
    return found;
  },

  async appendAudit(event) {
    const events = await readJson<AuditEvent[]>(paths.audit(), []);
    const created: AuditEvent = { ...event, id: randomUUID() };
    events.push(created);
    await writeJson(paths.audit(), events);
    return created;
  },

  async listAudit(packageId) {
    if (!isPersistenceAvailable()) return [];
    const events = await readJson<AuditEvent[]>(paths.audit(), []);
    const filtered = packageId ? events.filter((e) => e.packageId === packageId) : events;
    return filtered.sort((a, b) => b.at.localeCompare(a.at));
  },
};

export const seedMappings = (): MappingRule[] => [...SEED];
export const mappingFingerprint = fingerprint;
