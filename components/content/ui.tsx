"use client";

import type { ArticleStatus } from "@/lib/content/types";
import { ARTICLE_STATUS_LABELS } from "@/lib/content/types";

/**
 * Shared presentation pieces for the content screens.
 *
 * Status colour is meaning, not decoration: amber is "somebody else is holding
 * this", rose is "you have something to do", teal is "cleared", slate is
 * "nothing is happening". An advisor should be able to read their dashboard at
 * a glance without reading a single word.
 */

const STATUS_STYLES: Record<ArticleStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  submitted: "bg-amber-50 text-amber-700 ring-amber-200",
  under_review: "bg-amber-50 text-amber-700 ring-amber-200",
  changes_requested: "bg-rose-50 text-rose-700 ring-rose-200",
  approved: "bg-[#006d6e]/10 text-[#006d6e] ring-[#006d6e]/20",
  scheduled: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  archived: "bg-slate-100 text-slate-400 ring-slate-200",
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: ArticleStatus;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full ring-1 ring-inset ${
        STATUS_STYLES[status]
      } ${
        size === "lg"
          ? "px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          : "px-2.5 py-0.5 text-xs font-medium"
      }`}
    >
      {ARTICLE_STATUS_LABELS[status]}
    </span>
  );
}

/** "v3", with the em-dash spacing the version history uses. */
export function RevisionTag({ number }: { number: number | null }) {
  if (!number) return <span className="text-slate-300">—</span>;
  return (
    <span className="font-mono text-xs text-slate-500">v{number}</span>
  );
}

/**
 * A date a person reads. Rendered from the ISO string on the client, so it
 * shows in the reader's own timezone — these are working timestamps for staff,
 * not the published dates on a public page, which are formatted server-side to
 * stay timezone-independent.
 */
export function WhenLabel({
  iso,
  withTime = false,
}: {
  iso: string | null | undefined;
  withTime?: boolean;
}) {
  if (!iso) return <span className="text-slate-300">—</span>;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return <span className="text-slate-300">—</span>;
  return (
    <time dateTime={iso} className="whitespace-nowrap">
      {date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
      })}
      {withTime && (
        <span className="text-slate-400">
          {" · "}
          {date.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      )}
    </time>
  );
}

export function SummaryCard({
  label,
  value,
  tone = "default",
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "default" | "attention" | "good";
  active?: boolean;
  onClick?: () => void;
}) {
  const toneClass =
    tone === "attention"
      ? "text-rose-600"
      : tone === "good"
        ? "text-[#006d6e]"
        : "text-slate-900";

  const content = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </>
  );

  if (!onClick) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-2xl border bg-white px-5 py-4 text-left shadow-sm transition hover:border-slate-300 ${
        active ? "border-[#006d6e] ring-1 ring-[#006d6e]/20" : "border-slate-200"
      }`}
    >
      {content}
    </button>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-base font-medium text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {body}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {children}
    </div>
  );
}

export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#006d6e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#005556] disabled:cursor-not-allowed disabled:opacity-50";

export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50";

export const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#006d6e] focus:ring-2 focus:ring-[#006d6e]/15";
