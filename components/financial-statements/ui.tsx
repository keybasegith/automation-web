/** Small shared pieces for the Financial Statement Generator screens. */

import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label, value, tone = "neutral", hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
  hint?: string;
}) {
  const toneClass = {
    neutral: "text-slate-900",
    good: "text-emerald-700",
    bad: "text-rose-700",
    warn: "text-amber-700",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    finalized: "bg-sky-50 text-sky-700 ring-sky-600/20",
    requires_review: "bg-amber-50 text-amber-800 ring-amber-600/20",
    blocking: "bg-rose-50 text-rose-700 ring-rose-600/20",
    warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
    info: "bg-slate-100 text-slate-600 ring-slate-500/20",
    open: "bg-rose-50 text-rose-700 ring-rose-600/20",
    resolved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    accepted: "bg-slate-100 text-slate-700 ring-slate-500/20",
    mapped: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    excluded: "bg-slate-100 text-slate-600 ring-slate-500/20",
    unmapped: "bg-rose-50 text-rose-700 ring-rose-600/20",
    ambiguous: "bg-rose-50 text-rose-700 ring-rose-600/20",
    active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    inactive: "bg-slate-100 text-slate-500 ring-slate-500/20",
  };
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ring-1 ring-inset ${
        map[status] ?? map.info
      }`}
    >
      {label}
    </span>
  );
}

export function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        aria-hidden
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
          passed ? "bg-emerald-600" : "bg-rose-600"
        }`}
      >
        {passed ? "✓" : "!"}
      </span>
      <span className={passed ? "text-slate-700" : "text-rose-700"}>{label}</span>
    </li>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}
