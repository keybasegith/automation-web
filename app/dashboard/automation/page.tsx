"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAdvisorPreferences,
  selectClients,
  type Client,
} from "@/lib/clients";
import { sendEmail } from "@/lib/emailSender";
import {
  getMarketData,
  randomMarketData,
  type MarketData,
} from "@/lib/marketData";
import { evaluateTriggers, type TriggerEvaluation } from "@/lib/triggers";
import type {
  GenerateEmailRequest,
  GenerateEmailResponse,
} from "@/lib/email/types";

type RunStatus =
  | "idle"
  | "pending"
  | "generating"
  | "drafted"
  | "sending"
  | "sent"
  | "error";

type EmailLifecycleStatus = "drafted" | "approved" | "sent";

interface RunResult {
  client: Client;
  status: RunStatus;
  email?: GenerateEmailResponse;
  error?: string;
  sentAt?: string;
  /** DB-persisted lifecycle status, independent of the in-memory run status. */
  lifecycleStatus?: EmailLifecycleStatus;
}

const formatPercent = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

export default function AutomationPage() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [simulationMode, setSimulationMode] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [previewClientId, setPreviewClientId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    setMarketData(getMarketData());
  }, []);

  const trigger: TriggerEvaluation | null = useMemo(
    () => (marketData ? evaluateTriggers(marketData) : null),
    [marketData]
  );

  const eligibleClients = useMemo(
    () => (trigger ? selectClients(trigger.triggerType) : []),
    [trigger]
  );

  const summary = useMemo(() => {
    const processed = results.length;
    const drafted = results.filter((r) =>
      ["drafted", "sending", "sent"].includes(r.status)
    ).length;
    const sent = results.filter((r) => r.status === "sent").length;
    const errors = results.filter((r) => r.status === "error").length;
    return { processed, drafted, sent, errors };
  }, [results]);

  const previewResult = useMemo(
    () => results.find((r) => r.client.id === previewClientId) ?? null,
    [results, previewClientId]
  );

  const handleRefreshMarket = () => {
    if (running) return;
    setMarketData((prev) => randomMarketData(prev ?? undefined));
    setResults([]);
    setRunError(null);
  };

  const updateResult = (clientId: string, patch: Partial<RunResult>) =>
    setResults((prev) =>
      prev.map((r) => (r.client.id === clientId ? { ...r, ...patch } : r))
    );

  const handleApprovePreview = async (clientId: string) => {
    const result = results.find((r) => r.client.id === clientId);
    if (!result?.email) return;
    try {
      const res = await fetch(`/api/emails/${result.email.emailId}/approve`, {
        method: "POST",
      });
      const data = (await res.json()) as
        | { id: string; status: EmailLifecycleStatus }
        | { error: string };
      if (!res.ok || "error" in data) {
        setRunError("error" in data ? data.error : `Request failed (${res.status}).`);
        return;
      }
      updateResult(clientId, { lifecycleStatus: data.status });
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Network error.");
    }
  };

  const handleSendPreview = async (clientId: string) => {
    const result = results.find((r) => r.client.id === clientId);
    if (!result?.email) return;
    try {
      const res = await fetch(`/api/emails/${result.email.emailId}/send`, {
        method: "POST",
      });
      const data = (await res.json()) as
        | { id: string; status: EmailLifecycleStatus; sentAt: string }
        | { error: string };
      if (!res.ok || "error" in data) {
        setRunError("error" in data ? data.error : `Request failed (${res.status}).`);
        return;
      }
      updateResult(clientId, {
        lifecycleStatus: data.status,
        sentAt: "sentAt" in data ? data.sentAt : undefined,
      });
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Network error.");
    }
  };

  const handleRun = async () => {
    if (!marketData || !trigger || running) return;

    const triggerType = trigger.triggerType;
    const severity = trigger.severity;

    if (!triggerType) {
      setRunError("Markets are stable — no trigger fired. No emails generated.");
      setResults([]);
      return;
    }

    const snapshot = marketData;

    setRunError(null);
    setRunning(true);

    const initial: RunResult[] = eligibleClients.map((client) => ({
      client,
      status: "pending",
    }));
    setResults(initial);

    const updateOne = (clientId: string, patch: Partial<RunResult>) =>
      setResults((prev) =>
        prev.map((r) => (r.client.id === clientId ? { ...r, ...patch } : r))
      );

    await Promise.all(
      eligibleClients.map(async (client) => {
        updateOne(client.id, { status: "generating" });

        const prefs = getAdvisorPreferences(client, severity, triggerType);

        const eventDetails = `${
          triggerType === "Market Drop" ? "Markets fell" : "Markets advanced"
        } ${formatPercent(snapshot.sp500Change)} on the S&P 500 and ${formatPercent(
          snapshot.nasdaqChange
        )} on the NASDAQ on ${snapshot.date}.`;

        const payload: GenerateEmailRequest = {
          clientId: client.id,
          client: {
            clientName: client.clientName,
            email: client.email,
            age: client.age,
            riskTolerance: client.riskTolerance,
            investmentHorizon: client.investmentHorizon,
            portfolioValue: client.portfolioValue,
            clientType: client.clientType,
          },
          event: {
            eventType: triggerType,
            eventDetails,
          },
          preferences: prefs,
          marketContext: {
            sp500Change: snapshot.sp500Change,
            nasdaqChange: snapshot.nasdaqChange,
            date: snapshot.date,
            severity,
          },
        };

        try {
          const res = await fetch("/api/generate-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json()) as
            | GenerateEmailResponse
            | { error: string; detail?: string };

          if (!res.ok || "error" in data) {
            updateOne(client.id, {
              status: "error",
              error: "error" in data ? data.error : `Request failed (${res.status})`,
            });
            return;
          }

          updateOne(client.id, {
            status: "drafted",
            email: data,
            lifecycleStatus: "drafted",
          });

          if (!simulationMode) {
            updateOne(client.id, { status: "sending" });
            const sendRes = await sendEmail(client, data);
            updateOne(client.id, {
              status: sendRes.success ? "sent" : "error",
              sentAt: sendRes.sentAt,
              error: sendRes.error,
            });
          }
        } catch (err) {
          updateOne(client.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Network error",
          });
        }
      })
    );

    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/dashboard/client-communication"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
      >
        <span aria-hidden>←</span> Back to Client Communication
      </Link>

      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Client Communication & Outreach
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Automation Engine
        </h2>
        <p className="text-sm text-slate-500">
          Detect market events, target clients, and draft compliance-aware
          emails — end to end.
        </p>
      </header>

      <ComplianceBanner />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <MarketStatusCard
          marketData={marketData}
          trigger={trigger}
          eligibleCount={eligibleClients.length}
          onRefresh={handleRefreshMarket}
          disabled={running}
        />
        <ControlCard
          simulationMode={simulationMode}
          onToggleSimulation={() => setSimulationMode((v) => !v)}
          onRun={handleRun}
          running={running}
          canRun={!!trigger?.triggerType && eligibleClients.length > 0}
          summary={summary}
          eligibleCount={eligibleClients.length}
        />
      </div>

      {runError && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          {runError}
        </div>
      )}

      {results.length > 0 && (
        <ResultsTable
          results={results}
          simulationMode={simulationMode}
          onPreview={(id) => setPreviewClientId(id)}
        />
      )}

      {previewResult && (
        <PreviewModal
          result={previewResult}
          onClose={() => setPreviewClientId(null)}
          onApprove={() => handleApprovePreview(previewResult.client.id)}
          onSend={() => handleSendPreview(previewResult.client.id)}
        />
      )}
    </div>
  );
}

function ComplianceBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
        !
      </div>
      <p className="text-sm text-amber-900">
        AI-generated communication. Advisor review required before sending.
      </p>
    </div>
  );
}

interface MarketStatusCardProps {
  marketData: MarketData | null;
  trigger: TriggerEvaluation | null;
  eligibleCount: number;
  onRefresh: () => void;
  disabled: boolean;
}

function MarketStatusCard({
  marketData,
  trigger,
  eligibleCount,
  onRefresh,
  disabled,
}: MarketStatusCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Market Status</h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {!marketData ? (
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="S&P 500"
              value={formatPercent(marketData.sp500Change)}
              positive={marketData.sp500Change >= 0}
            />
            <Stat
              label="NASDAQ"
              value={formatPercent(marketData.nasdaqChange)}
              positive={marketData.nasdaqChange >= 0}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-500">
                  Detected event
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-900">
                  {trigger?.triggerType ?? "Stable — no trigger"}
                </span>
              </div>
              {trigger?.triggerType && (
                <SeverityPill severity={trigger.severity} />
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{marketData.date}</span>
              <span>
                {trigger?.triggerType
                  ? `${eligibleCount} client${eligibleCount === 1 ? "" : "s"} targeted`
                  : "No clients targeted"}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          positive ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SeverityPill({ severity }: { severity: "Low" | "Medium" | "High" }) {
  const cls =
    severity === "High"
      ? "bg-red-50 text-red-700 ring-red-200"
      : severity === "Medium"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {severity} severity
    </span>
  );
}

interface ControlCardProps {
  simulationMode: boolean;
  onToggleSimulation: () => void;
  onRun: () => void;
  running: boolean;
  canRun: boolean;
  summary: { processed: number; drafted: number; sent: number; errors: number };
  eligibleCount: number;
}

function ControlCard({
  simulationMode,
  onToggleSimulation,
  onRun,
  running,
  canRun,
  summary,
  eligibleCount,
}: ControlCardProps) {
  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Run Pipeline</h3>

      <label className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <span className="text-sm font-medium text-slate-900">
            Simulation Mode
          </span>
          <p className="mt-1 text-xs text-slate-500">
            {simulationMode
              ? "Drafts only — no send step is invoked."
              : "Drafts and dispatches via the simulated transport."}
          </p>
        </div>
        <Toggle checked={simulationMode} onChange={onToggleSimulation} />
      </label>

      <button
        type="button"
        onClick={onRun}
        disabled={running || !canRun}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {running ? (
          <>
            <Spinner /> Running automation…
          </>
        ) : summary.processed > 0 ? (
          "Run Again"
        ) : (
          `Run Automation${eligibleCount > 0 ? ` · ${eligibleCount} client${eligibleCount === 1 ? "" : "s"}` : ""}`
        )}
      </button>

      {summary.processed > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2">
          <SummaryStat label="Drafted" value={summary.drafted} />
          <SummaryStat label="Sent" value={summary.sent} accent="emerald" />
          <SummaryStat
            label="Errors"
            value={summary.errors}
            accent={summary.errors > 0 ? "red" : "slate"}
          />
        </div>
      )}
    </section>
  );
}

function SummaryStat({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number;
  accent?: "slate" | "emerald" | "red";
}) {
  const valueClass =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "red"
        ? "text-red-600"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-brand" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

interface ResultsTableProps {
  results: RunResult[];
  simulationMode: boolean;
  onPreview: (id: string) => void;
}

function ResultsTable({ results, simulationMode, onPreview }: ResultsTableProps) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Pipeline Results</h3>
        <span className="text-xs text-slate-500">
          {simulationMode ? "Simulation mode" : "Send mode (simulated transport)"}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Risk</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((result) => (
              <tr key={result.client.id} className="text-slate-700">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900">
                      {result.client.clientName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {result.client.email}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  {result.client.clientType}
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  {result.client.riskTolerance}
                </td>
                <td className="px-6 py-4">
                  <StatusPill status={result.status} error={result.error} />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onPreview(result.client.id)}
                    disabled={!result.email}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Preview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ status, error }: { status: RunStatus; error?: string }) {
  const config: Record<RunStatus, { label: string; className: string }> = {
    idle: {
      label: "Idle",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
    },
    pending: {
      label: "Queued",
      className: "bg-slate-100 text-slate-600 ring-slate-200",
    },
    generating: {
      label: "Generating…",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    drafted: {
      label: "Drafted",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    sending: {
      label: "Sending…",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
    },
    sent: {
      label: "Sent",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    error: {
      label: "Error",
      className: "bg-red-50 text-red-700 ring-red-200",
    },
  };
  const c = config[status];
  return (
    <span
      title={error ?? undefined}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.className}`}
    >
      {(status === "generating" || status === "sending") && (
        <Spinner small />
      )}
      <span className={status === "generating" || status === "sending" ? "ml-1.5" : ""}>
        {c.label}
      </span>
    </span>
  );
}

function LifecyclePill({ status }: { status: EmailLifecycleStatus }) {
  const config: Record<
    EmailLifecycleStatus,
    { label: string; className: string }
  > = {
    drafted: {
      label: "Drafted",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    },
    approved: {
      label: "✓ Approved",
      className: "bg-amber-50 text-amber-800 ring-amber-200",
    },
    sent: {
      label: "✓ Sent",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function PreviewModal({
  result,
  onClose,
  onApprove,
  onSend,
}: {
  result: RunResult;
  onClose: () => void;
  onApprove: () => void;
  onSend: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState<null | "approve" | "send">(
    null
  );
  const email = result.email;
  if (!email) return null;

  const lifecycle = result.lifecycleStatus ?? "drafted";
  const isApproved = lifecycle === "approved" || lifecycle === "sent";
  const isSent = lifecycle === "sent";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Subject: ${email.subject}\n\n${email.body}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const wrapAction = (
    kind: "approve" | "send",
    fn: () => void
  ) => async () => {
    setActionLoading(kind);
    try {
      await fn();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex flex-col">
            <p className="text-xs font-medium text-slate-500">
              {result.client.clientName} · {result.client.email}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900">
              {email.subject}
            </h3>
            <div className="mt-2">
              <LifecyclePill status={lifecycle} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {email.body}
          </p>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3">
          <span className="text-xs text-slate-500">
            {result.sentAt
              ? `Sent ${formatTime(result.sentAt)}`
              : "Draft only — review before sending"}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={wrapAction("approve", onApprove)}
              disabled={isApproved || actionLoading !== null}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "approve" && <Spinner small />}
              {isApproved ? "Approved" : "Approve"}
            </button>
            <button
              type="button"
              onClick={wrapAction("send", onSend)}
              disabled={!isApproved || isSent || actionLoading !== null}
              title={
                !isApproved
                  ? "Approve before sending"
                  : isSent
                    ? "Already sent"
                    : "Send"
              }
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading === "send" && <Spinner small />}
              {isSent ? "Sent" : "Send"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Spinner({ small = false }: { small?: boolean }) {
  const size = small ? "h-3 w-3" : "h-4 w-4";
  return (
    <svg
      className={`${size} animate-spin text-current`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
