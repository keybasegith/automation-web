"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getClientsNeedingRefresh,
  summarizeRefreshQueue,
  type ClientNeedingRefresh,
  type RefreshPriority,
} from "@/lib/documentRefresh";
import type {
  DocumentRefreshContext,
  GenerateEmailRequest,
  GenerateEmailResponse,
} from "@/lib/email/types";

type LifecycleStatus = "drafted" | "approved" | "sent";

interface DraftState {
  clientId: string;
  emailId: string;
  subject: string;
  body: string;
  generatedAt: string;
  status: LifecycleStatus;
  edited: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

export default function DocumentRefreshPage() {
  const queue = useMemo(() => getClientsNeedingRefresh(), []);
  const summary = useMemo(() => summarizeRefreshQueue(queue), [queue]);

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] =
    useState<null | "approve" | "send">(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const wordCount = draft
    ? draft.body.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const handleGenerate = async (row: ClientNeedingRefresh) => {
    if (generatingFor) return;
    setError(null);
    setGeneratingFor(row.client.id);

    const documentContext: DocumentRefreshContext = {
      priority: row.priority,
      documents: row.documents.map((d) => ({
        type: d.type,
        status: d.status as "expiring" | "expired",
        expiryDate: d.expiryDate,
      })),
    };

    const eventDetails = `Client has ${
      row.expiredCount > 0 ? `${row.expiredCount} expired` : ""
    }${
      row.expiredCount > 0 && row.expiringCount > 0 ? " and " : ""
    }${
      row.expiringCount > 0 ? `${row.expiringCount} expiring` : ""
    } document${row.documents.length === 1 ? "" : "s"} (${row.documents
      .map((d) => d.type)
      .join(", ")}) requiring update.`;

    const payload: GenerateEmailRequest = {
      clientId: row.client.id,
      client: {
        clientName: row.client.clientName,
        email: row.client.email,
        age: row.client.age,
        riskTolerance: row.client.riskTolerance,
        investmentHorizon: row.client.investmentHorizon,
        portfolioValue: row.client.portfolioValue,
        clientType: row.client.clientType,
      },
      event: {
        eventType: "Document Refresh",
        eventDetails,
      },
      preferences: {
        tone: "Professional",
        communicationStyle: "Detailed",
      },
      documentContext,
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
        setError(
          "error" in data ? data.error : `Request failed (${res.status}).`
        );
        return;
      }

      setDraft({
        clientId: row.client.id,
        emailId: data.emailId,
        subject: data.subject,
        body: data.body,
        generatedAt: new Date().toISOString(),
        status: "drafted",
        edited: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleApprove = async () => {
    if (!draft || actionLoading) return;
    setError(null);
    setActionLoading("approve");
    try {
      const res = await fetch(`/api/emails/${draft.emailId}/approve`, {
        method: "POST",
      });
      const data = (await res.json()) as
        | { id: string; status: LifecycleStatus }
        | { error: string };
      if (!res.ok || "error" in data) {
        setError(
          "error" in data ? data.error : `Request failed (${res.status}).`
        );
        return;
      }
      setDraft({ ...draft, status: data.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async () => {
    if (!draft || actionLoading) return;
    setError(null);
    setActionLoading("send");
    try {
      const res = await fetch(`/api/emails/${draft.emailId}/send`, {
        method: "POST",
      });
      const data = (await res.json()) as
        | { id: string; status: LifecycleStatus; sentAt: string }
        | { error: string };
      if (!res.ok || "error" in data) {
        setError(
          "error" in data ? data.error : `Request failed (${res.status}).`
        );
        return;
      }
      setDraft({ ...draft, status: data.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(
        `Subject: ${draft.subject}\n\n${draft.body}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleRegenerate = () => {
    if (!draft) return;
    const row = queue.find((r) => r.client.id === draft.clientId);
    if (row) handleGenerate(row);
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
          Outreach module
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Automated Document Refresh & Outreach
        </h2>
        <p className="text-sm text-slate-500">
          Detect outdated client documents and draft compliance-aware outreach
          emails. Drafts only — every send still requires advisor review.
        </p>
      </header>

      <ComplianceBanner />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Needing refresh"
          value={summary.total}
          accent="brand"
          hint="Clients with at least one expired or expiring document"
        />
        <SummaryCard
          label="High priority"
          value={summary.high}
          accent="red"
          hint="At least one document is expired"
        />
        <SummaryCard
          label="Medium priority"
          value={summary.medium}
          accent="amber"
          hint="Document expires within 30 days"
        />
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <RefreshTable
          queue={queue}
          generatingFor={generatingFor}
          activeClientId={draft?.clientId ?? null}
          onGenerate={handleGenerate}
        />

        <PreviewPanel
          draft={draft}
          generating={generatingFor !== null}
          actionLoading={actionLoading}
          error={error}
          copied={copied}
          wordCount={wordCount}
          onEditSubject={(v) =>
            draft && setDraft({ ...draft, subject: v, edited: true })
          }
          onEditBody={(v) =>
            draft && setDraft({ ...draft, body: v, edited: true })
          }
          onCopy={handleCopy}
          onRegenerate={handleRegenerate}
          onApprove={handleApprove}
          onSend={handleSend}
        />
      </div>
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

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: "brand" | "red" | "amber";
}) {
  const valueClass =
    accent === "brand"
      ? "text-brand"
      : accent === "red"
        ? "text-red-600"
        : "text-amber-700";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function RefreshTable({
  queue,
  generatingFor,
  activeClientId,
  onGenerate,
}: {
  queue: ClientNeedingRefresh[];
  generatingFor: string | null;
  activeClientId: string | null;
  onGenerate: (row: ClientNeedingRefresh) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Refresh Queue
        </h3>
        <span className="text-xs text-slate-500">
          {queue.length} client{queue.length === 1 ? "" : "s"}
        </span>
      </header>

      {queue.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">
            All documents current
          </p>
          <p className="mt-1 text-xs text-slate-500">
            No expired or expiring documents detected. Nothing to action.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Documents</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3 text-right" aria-label="Action" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.map((row) => (
                <tr
                  key={row.client.id}
                  className={`align-top text-slate-700 transition ${
                    activeClientId === row.client.id ? "bg-brand-soft/40" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/clients/${row.client.id}`}
                      className="flex flex-col"
                    >
                      <span className="font-medium text-slate-900">
                        {row.client.clientName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {row.client.email}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="flex flex-col gap-1">
                      {row.documents.map((doc) => (
                        <li
                          key={doc.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <DocStatusPill
                            status={doc.status as "expiring" | "expired"}
                          />
                          <span className="font-medium text-slate-800">
                            {doc.type}
                          </span>
                          <span className="text-slate-500">
                            {doc.status === "expired" ? "expired" : "expires"}{" "}
                            {formatDate(doc.expiryDate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4">
                    <PriorityPill priority={row.priority} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onGenerate(row)}
                      disabled={generatingFor !== null}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-xs font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {generatingFor === row.client.id ? (
                        <>
                          <Spinner /> Generating…
                        </>
                      ) : (
                        "Generate Email"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PriorityPill({ priority }: { priority: RefreshPriority }) {
  const cls =
    priority === "HIGH"
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {priority}
    </span>
  );
}

function DocStatusPill({ status }: { status: "expiring" | "expired" }) {
  const cls =
    status === "expired"
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-amber-50 text-amber-800 ring-amber-200";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${cls}`}
    >
      {status}
    </span>
  );
}

function PreviewPanel({
  draft,
  generating,
  actionLoading,
  error,
  copied,
  wordCount,
  onEditSubject,
  onEditBody,
  onCopy,
  onRegenerate,
  onApprove,
  onSend,
}: {
  draft: DraftState | null;
  generating: boolean;
  actionLoading: null | "approve" | "send";
  error: string | null;
  copied: boolean;
  wordCount: number;
  onEditSubject: (value: string) => void;
  onEditBody: (value: string) => void;
  onCopy: () => void;
  onRegenerate: () => void;
  onApprove: () => void;
  onSend: () => void;
}) {
  const isApproved =
    draft?.status === "approved" || draft?.status === "sent";
  const isSent = draft?.status === "sent";

  return (
    <section className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Generated Email
          </h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            AI-Generated (Review Required)
          </span>
        </div>
        {draft && <LifecyclePill status={draft.status} />}
      </header>

      <div className="flex-1 p-6">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!draft && !generating && !error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand shadow-sm">
              ✉
            </div>
            <p className="text-sm font-medium text-slate-700">
              No email selected
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Pick a client from the table and click <b>Generate Email</b> to
              draft an outreach message.
            </p>
          </div>
        )}

        {!draft && generating && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
            <Spinner large />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Drafting email…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Applying compliance rules and document context.
            </p>
          </div>
        )}

        {draft && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">
                Subject
              </label>
              <input
                type="text"
                value={draft.subject}
                onChange={(e) => onEditSubject(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-500">
                  Body
                </label>
                <span className="text-xs text-slate-400">
                  {wordCount} words · {draft.body.length} chars
                </span>
              </div>
              <textarea
                value={draft.body}
                onChange={(e) => onEditBody(e.target.value)}
                rows={14}
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Generated {formatTime(draft.generatedAt)}
                {draft.edited && " · edited"}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={generating}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {generating ? <Spinner /> : null}
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={isApproved || actionLoading !== null}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "approve" && <Spinner />}
                  {isApproved ? "Approved" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={onSend}
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
                  {actionLoading === "send" && <Spinner />}
                  {isSent ? "Sent" : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LifecyclePill({ status }: { status: LifecycleStatus }) {
  const config: Record<
    LifecycleStatus,
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

function Spinner({ large = false }: { large?: boolean }) {
  const size = large ? "h-6 w-6" : "h-4 w-4";
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";
