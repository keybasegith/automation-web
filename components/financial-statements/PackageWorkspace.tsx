"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { MappingRuleDto, PackageDto } from "@/lib/financial-statements/api";
import type { AuditEvent } from "@/lib/financial-statements/types";
import StatementTable from "./StatementTable";
import { Card, CheckRow, EmptyState, StatCard, StatusPill } from "./ui";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "trial-balance", label: "Trial Balance" },
  { key: "balance-sheet", label: "Balance Sheet" },
  { key: "income-statement", label: "Income Statement" },
  { key: "exceptions", label: "Exceptions" },
  { key: "gl-mapping", label: "GL Mapping" },
  { key: "audit", label: "Audit Log" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Every download is offered in both formats, from the same stored result. */
const EXPORTS = [
  { scope: "balance_sheet", label: "Balance Sheet" },
  { scope: "income_statement", label: "Income Statement" },
  { scope: "package", label: "Full package" },
  { scope: "trial_balance", label: "Normalized Trial Balance" },
  { scope: "exceptions", label: "Exceptions & reconciliation" },
] as const;

const FORMATS = [
  { format: "xlsx", label: "Excel" },
  { format: "pdf", label: "PDF" },
] as const;

/** Save a fetched blob under the filename the server asked for. */
async function saveResponse(response: Response, fallbackName: string) {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * Excel and PDF for one scope.
 *
 * Where the run was stored, these are plain links to the stored version. Where
 * it was not — a deployment with no writable storage — the Trial Balance is
 * posted back and the statements are regenerated to render. The engine is
 * deterministic, so both routes produce the same figures.
 */
export function DownloadButtons({
  packageId, scope, size = "sm", sourceFile,
}: {
  packageId: string;
  scope: (typeof EXPORTS)[number]["scope"];
  size?: "sm" | "md";
  sourceFile?: File | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const padding = size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  const className = `rounded-md border border-slate-300 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${padding}`;

  async function download(format: string) {
    if (!sourceFile) return;
    setBusy(format);
    setFailed(null);
    try {
      const form = new FormData();
      form.append("file", sourceFile);
      form.append("scope", scope);
      form.append("format", format);
      const response = await fetch("/api/financial-statements/export", { method: "POST", body: form });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "The download could not be produced.");
      }
      await saveResponse(response, `statements.${format}`);
    } catch (cause) {
      setFailed(cause instanceof Error ? cause.message : "The download could not be produced.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {FORMATS.map((entry) =>
        sourceFile ? (
          <button
            key={entry.format}
            type="button"
            disabled={busy !== null}
            onClick={() => download(entry.format)}
            className={className}
          >
            {busy === entry.format ? "Preparing…" : entry.label}
          </button>
        ) : (
          <a
            key={entry.format}
            href={`/api/financial-statements/packages/${packageId}/export?scope=${scope}&format=${entry.format}`}
            className={className}
          >
            {entry.label}
          </a>
        )
      )}
      {failed ? <span className="text-xs text-rose-700">{failed}</span> : null}
    </span>
  );
}

export default function PackageWorkspace({
  initial,
  sourceFile = null,
}: {
  initial: PackageDto;
  /** Present for a run held only in this browser session. */
  sourceFile?: File | null;
}) {
  const router = useRouter();
  const [pkg, setPkg] = useState(initial);
  const [tab, setTab] = useState<TabKey>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const persisted = pkg.persisted;
  const blocking = pkg.exceptions.filter((e) => e.severity === "blocking" && e.status === "open");
  const warnings = pkg.exceptions.filter((e) => e.severity === "warning" && e.status === "open");

  const act = useCallback(
    async (path: string, label: string) => {
      setBusy(label);
      setError(null);
      try {
        const response = await fetch(`/api/financial-statements/packages/${pkg.statementPackage.id}${path}`, {
          method: "POST",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "That did not work.");
        setPkg(body.package);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "That did not work.");
      } finally {
        setBusy(null);
      }
    },
    [pkg.statementPackage.id, router]
  );

  const setExceptionStatus = useCallback(
    async (exceptionId: string, status: "open" | "resolved" | "accepted") => {
      setBusy(exceptionId);
      setError(null);
      try {
        const response = await fetch(
          `/api/financial-statements/packages/${pkg.statementPackage.id}/exceptions/${encodeURIComponent(exceptionId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "That did not work.");
        setPkg((current) => ({
          ...current,
          exceptions: current.exceptions.map((e) => (e.id === exceptionId ? body.exception : e)),
        }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "That did not work.");
      } finally {
        setBusy(null);
      }
    },
    [pkg.statementPackage.id]
  );

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            Financial Statement Generator
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {pkg.statementPackage.periodLabel}
          </h2>
          <p className="text-sm text-slate-500">
            {pkg.statementPackage.entityName} · version {pkg.version} · from{" "}
            <span className="font-mono">{pkg.statementPackage.sourceFileName}</span> · mapping{" "}
            <span className="font-mono">{pkg.statementPackage.mappingVersion}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={pkg.statementPackage.status} />
          <Link
            href="/financial-statement-generator"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            All packages
          </Link>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {!persisted ? (
        <p className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          This run is held in your browser only — this deployment keeps no record of it. The statements
          and downloads below are complete; reload the page and you would upload again. Nothing was
          stored anywhere.
        </p>
      ) : null}

      <nav className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.filter((entry) => persisted || entry.key !== "audit").map((entry) => {
          const active = tab === entry.key;
          const count =
            entry.key === "exceptions" && blocking.length > 0 ? ` (${blocking.length})` : "";
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                active
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {entry.label}
              {count}
            </button>
          );
        })}
      </nav>

      {tab === "overview" ? (
        <OverviewTab pkg={pkg} blocking={blocking.length} warnings={warnings.length} busy={busy} act={act} sourceFile={sourceFile} />
      ) : null}
      {tab === "trial-balance" ? <TrialBalanceTab pkg={pkg} /> : null}
      {tab === "balance-sheet" ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <p className="text-sm text-slate-500">Download this statement</p>
            <DownloadButtons packageId={pkg.statementPackage.id} scope="balance_sheet" size="md" sourceFile={sourceFile} />
          </div>
          <StatementTable statement={pkg.balanceSheet} />
        </Card>
      ) : null}
      {tab === "income-statement" ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <p className="text-sm text-slate-500">Download this statement</p>
            <DownloadButtons packageId={pkg.statementPackage.id} scope="income_statement" size="md" sourceFile={sourceFile} />
          </div>
          <StatementTable statement={pkg.incomeStatement} />
        </Card>
      ) : null}
      {tab === "exceptions" ? (
        <ExceptionsTab pkg={pkg} busy={busy} onSetStatus={setExceptionStatus} />
      ) : null}
      {tab === "gl-mapping" ? <MappingTab /> : null}
      {tab === "audit" ? <AuditTab packageId={pkg.statementPackage.id} /> : null}
    </div>
  );
}

function OverviewTab({
  pkg, blocking, warnings, busy, act, sourceFile,
}: {
  pkg: PackageDto;
  blocking: number;
  warnings: number;
  busy: string | null;
  act: (path: string, label: string) => Promise<void>;
  sourceFile?: File | null;
}) {
  const readiness = pkg.readiness;
  const finalized = pkg.statementPackage.status === "finalized";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Trial Balance"
          value={pkg.trialBalance.isBalanced ? "Balanced" : "Not balanced"}
          tone={pkg.trialBalance.isBalanced ? "good" : "bad"}
          hint={`${pkg.trialBalance.rowCount} rows · difference ${pkg.trialBalance.difference}`}
        />
        <StatCard
          label="GL Mapping"
          value={`${pkg.reconciliation.counts.mapped} mapped`}
          tone={pkg.reconciliation.counts.unmapped + pkg.reconciliation.counts.ambiguous === 0 ? "good" : "bad"}
          hint={`${pkg.reconciliation.counts.unmapped} unmapped · ${pkg.reconciliation.counts.ambiguous} ambiguous · ${pkg.reconciliation.counts.excluded} excluded`}
        />
        <StatCard
          label="Balance Sheet"
          value={pkg.balanceSheetBalanced ? "Balanced" : "Out of balance"}
          tone={pkg.balanceSheetBalanced ? "good" : "bad"}
          hint={`Difference ${pkg.balanceSheet.totals.differenceCents}`}
        />
        <StatCard label="Income Statement" value={pkg.netIncome} hint="Net income" />
        <StatCard
          label="Exceptions"
          value={`${blocking} blocking`}
          tone={blocking > 0 ? "bad" : warnings > 0 ? "warn" : "good"}
          hint={`${warnings} warning${warnings === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Finalization checks</h3>
          <ul className="space-y-1.5">
            <CheckRow label="Trial Balance balances" passed={readiness.trialBalanceBalanced} />
            <CheckRow label="Every account is mapped" passed={readiness.allAccountsMapped} />
            <CheckRow label="No ambiguous mappings" passed={readiness.noAmbiguousMappings} />
            <CheckRow label="Balance Sheet balances" passed={readiness.balanceSheetBalanced} />
            <CheckRow label="Net income reconciles" passed={readiness.netIncomeReconciles} />
            <CheckRow label="Every line traces to its GL rows" passed={readiness.traceabilityPasses} />
            <CheckRow label="Every row is reconciled" passed={readiness.reconciliationComplete} />
            <CheckRow label="No blocking exceptions" passed={readiness.noBlockingExceptions} />
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            {!pkg.persisted ? (
              <p className="text-xs text-slate-500">
                Finalizing and regenerating record a decision against a stored package. This deployment
                keeps no record, so the checks above are shown for review only.
              </p>
            ) : finalized ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => act("/reopen", "reopen")}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === "reopen" ? "Reopening…" : "Reopen"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!readiness.canFinalize || busy !== null}
                  onClick={() => act("/finalize", "finalize")}
                  className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === "finalize" ? "Finalizing…" : "Finalize"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => act("/regenerate", "regenerate")}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy === "regenerate" ? "Regenerating…" : "Regenerate"}
                </button>
              </>
            )}
          </div>
          {!readiness.canFinalize && !finalized ? (
            <p className="mt-2 text-xs text-slate-500">
              Finalizing stays disabled until every check above passes.
            </p>
          ) : null}
        </Card>

        <Card>
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Reconciliation</h3>
          <p className="mb-3 text-xs text-slate-500">
            Every Trial Balance row lands in exactly one of these.
          </p>
          <dl className="space-y-1.5 text-sm">
            {[
              ["Mapped to Balance Sheet", pkg.reconciliation.balanceSheet],
              ["Mapped to Income Statement", pkg.reconciliation.incomeStatement],
              ["Approved exclusions", pkg.reconciliation.excluded],
              ["Unmapped", pkg.reconciliation.unmapped],
              ["Ambiguous", pkg.reconciliation.ambiguous],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-600">{label}</dt>
                <dd className="tabular-nums text-slate-900">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-1.5 font-semibold">
              <dt className="text-slate-700">Accounted for</dt>
              <dd className="tabular-nums text-slate-900">{pkg.reconciliation.accounted}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">Trial Balance net</dt>
              <dd className="tabular-nums text-slate-900">{pkg.reconciliation.trialBalanceNet}</dd>
            </div>
          </dl>

          <h3 className="mb-1 mt-5 text-sm font-semibold text-slate-900">Download</h3>
          <p className="mb-2 text-xs text-slate-500">
            Excel or PDF — both render the reviewed figures, nothing is recalculated.
          </p>
          <ul className="divide-y divide-slate-100">
            {EXPORTS.map((entry) => (
              <li key={entry.scope} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-sm text-slate-700">{entry.label}</span>
                <DownloadButtons packageId={pkg.statementPackage.id} scope={entry.scope} sourceFile={sourceFile} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function TrialBalanceTab({ pkg }: { pkg: PackageDto }) {
  const [filter, setFilter] = useState("");
  const rows = pkg.rows.filter((row) => {
    if (!filter.trim()) return true;
    const needle = filter.toLowerCase();
    return (
      row.accountCode.toLowerCase().includes(needle) ||
      row.description.toLowerCase().includes(needle) ||
      row.statementLine.toLowerCase().includes(needle)
    );
  });

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Normalized Trial Balance</h3>
          <p className="text-xs text-slate-500">
            {pkg.trialBalance.rowCount} rows · debits {pkg.trialBalance.totalDebits} · credits{" "}
            {pkg.trialBalance.totalCredits} · difference {pkg.trialBalance.difference}
          </p>
        </div>
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by account, description or line"
          className="w-72 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-3 font-medium">Account</th>
              <th className="py-2 pr-3 font-medium">Description</th>
              <th className="py-2 pr-3 text-right font-medium">Debit</th>
              <th className="py-2 pr-3 text-right font-medium">Credit</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Statement line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.sourceRowNumber}-${row.accountCode}`} className="hover:bg-slate-50">
                <td className="py-1.5 pr-3 font-mono text-xs">{row.accountCode}</td>
                <td className="py-1.5 pr-3 text-slate-700">{row.description}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{row.debit}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{row.credit}</td>
                <td className="py-1.5 pr-3"><StatusPill status={row.outcome} /></td>
                <td className="py-1.5 pr-3 text-slate-600">
                  {row.statementLine}
                  {row.statement ? <span className="ml-1 text-xs text-slate-400">({row.statement})</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Nothing matches that filter.</p>
        ) : null}
      </div>
    </Card>
  );
}

function ExceptionsTab({
  pkg, busy, onSetStatus,
}: {
  pkg: PackageDto;
  busy: string | null;
  onSetStatus: (id: string, status: "open" | "resolved" | "accepted") => void;
}) {
  if (pkg.exceptions.length === 0) {
    return <EmptyState title="No exceptions" body="Every account mapped and every check passed." />;
  }

  const order = { blocking: 0, warning: 1, info: 2 } as const;
  const sorted = [...pkg.exceptions].sort(
    (a, b) => order[a.severity] - order[b.severity] || a.title.localeCompare(b.title)
  );

  return (
    <div className="space-y-3">
      {sorted.map((exception) => (
        <Card key={exception.id} className={exception.status !== "open" ? "opacity-60" : ""}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <StatusPill status={exception.severity} />
                <StatusPill status={exception.status} />
                <code className="text-xs text-slate-500">{exception.code}</code>
              </div>
              <p className="text-sm font-semibold text-slate-900">{exception.title}</p>
              <p className="mt-1 text-sm text-slate-600">{exception.detail}</p>
              {exception.amount ? (
                <p className="mt-1 text-sm tabular-nums text-slate-700">Amount: {exception.amount}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              {!pkg.persisted ? null : exception.status === "open" ? (
                <>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => onSetStatus(exception.id, "resolved")}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Mark resolved
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => onSetStatus(exception.id, "accepted")}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Accept
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => onSetStatus(exception.id, "open")}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MappingTab() {
  const [mappings, setMappings] = useState<MappingRuleDto[] | null>(null);

  useEffect(() => {
    fetch("/api/financial-statements/mappings")
      .then((r) => r.json())
      .then((body) => setMappings(body.mappings ?? []))
      .catch(() => setMappings([]));
  }, []);

  if (!mappings) return <p className="text-sm text-slate-500">Loading the mapping table…</p>;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">GL mapping in use</h3>
          <p className="text-xs text-slate-500">{mappings.length} rules</p>
        </div>
        <Link
          href="/financial-statement-generator/gl-mapping"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Manage mappings
        </Link>
      </div>
      <MappingRows mappings={mappings} />
    </Card>
  );
}

export function MappingRows({ mappings }: { mappings: MappingRuleDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-2 pr-3 font-medium">Account / Rule</th>
            <th className="py-2 pr-3 font-medium">Statement</th>
            <th className="py-2 pr-3 font-medium">Section</th>
            <th className="py-2 pr-3 font-medium">Statement line</th>
            <th className="py-2 pr-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {mappings.map((mapping) => (
            <tr key={mapping.id} className="hover:bg-slate-50">
              <td className="py-1.5 pr-3 font-mono text-xs text-slate-800">{mapping.rule}</td>
              <td className="py-1.5 pr-3 text-slate-600">{mapping.statement}</td>
              <td className="py-1.5 pr-3 text-slate-600">
                {mapping.category} › {mapping.section}
              </td>
              <td className="py-1.5 pr-3 text-slate-800">
                {mapping.excluded ? (
                  <span className="text-slate-500">
                    Excluded
                    {mapping.exclusionReason ? (
                      <span className="ml-1 text-xs text-slate-400">— {mapping.exclusionReason}</span>
                    ) : null}
                  </span>
                ) : (
                  mapping.statementLine
                )}
              </td>
              <td className="py-1.5 pr-3"><StatusPill status={mapping.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTab({ packageId }: { packageId: string }) {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);

  useEffect(() => {
    fetch(`/api/financial-statements/packages/${packageId}/audit`)
      .then((r) => r.json())
      .then((body) => setEvents(body.events ?? []))
      .catch(() => setEvents([]));
  }, [packageId]);

  if (!events) return <p className="text-sm text-slate-500">Loading the audit trail…</p>;
  if (events.length === 0) return <EmptyState title="No audit events" body="Nothing has happened yet." />;

  return (
    <Card>
      <ol className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className="border-l-2 border-slate-200 pl-3">
            <p className="text-sm text-slate-900">{event.summary}</p>
            <p className="text-xs text-slate-500">
              {event.type.replace(/_/g, " ")} · {event.actor} ·{" "}
              {new Date(event.at).toLocaleString("en-CA")}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
