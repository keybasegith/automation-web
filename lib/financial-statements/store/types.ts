/**
 * The persistence contract.
 *
 * Everything above this line — routes, service layer, UI — is written against
 * this interface. The shipped implementation is a local JSON store that needs
 * no infrastructure; a database can be added later by satisfying the same
 * contract, without any calling code changing.
 */

import type {
  AuditEvent,
  ExceptionStatus,
  FinancialException,
  MappingRule,
  MappingStatusFlag,
  StatementPackage,
  StatementStatus,
} from "../types";
import type { GenerateStatementsResult } from "../engine/generateStatements";

/** One generated result, frozen. Regenerating adds a version, never edits one. */
export interface StatementVersion {
  packageId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  mappingVersion: string;
  result: GenerateStatementsResult;
}

export interface CreatePackageInput {
  entityName: string;
  periodLabel: string;
  fiscalYear: number;
  sourceFileName: string;
  sourceFileType: StatementPackage["sourceFileType"];
  sourceFileSizeBytes: number;
  mappingVersion: string;
  actor: string;
}

export interface FinancialStore {
  // --- GL mapping table ---
  listMappings(): Promise<MappingRule[]>;
  getMapping(id: string): Promise<MappingRule | null>;
  upsertMapping(rule: MappingRule): Promise<MappingRule>;
  setMappingStatus(id: string, status: MappingStatusFlag): Promise<MappingRule | null>;
  replaceMappings(rules: readonly MappingRule[]): Promise<MappingRule[]>;
  /** Changes whenever the table changes, so a package records what it used. */
  mappingVersion(): Promise<string>;

  // --- Packages and versions ---
  createPackage(input: CreatePackageInput): Promise<StatementPackage>;
  listPackages(): Promise<StatementPackage[]>;
  getPackage(id: string): Promise<StatementPackage | null>;
  setPackageStatus(id: string, status: StatementStatus, actor: string): Promise<StatementPackage | null>;
  deletePackage(id: string): Promise<void>;

  saveVersion(version: StatementVersion): Promise<StatementVersion>;
  getLatestVersion(packageId: string): Promise<StatementVersion | null>;
  listVersions(packageId: string): Promise<StatementVersion[]>;

  // --- Exceptions ---
  setExceptionStatus(
    packageId: string,
    exceptionId: string,
    status: ExceptionStatus,
    actor: string,
    note?: string
  ): Promise<FinancialException | null>;

  // --- Audit ---
  appendAudit(event: Omit<AuditEvent, "id">): Promise<AuditEvent>;
  listAudit(packageId?: string): Promise<AuditEvent[]>;
}
