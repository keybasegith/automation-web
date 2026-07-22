"use client";

/**
 * Form primitives for the verification screen.
 *
 * Two ideas drive these:
 *  1. Enumerated fields are ALWAYS a <select> bound to the form's exact
 *     vocabulary, so the rules engine can never receive a typo.
 *  2. Anything the reviewer still has to look at is visibly amber. A field is
 *     "needs attention" when it is blank or was never pre-filled, so the eye
 *     goes straight to the work.
 */

import type { ReactNode } from "react";
import type { FieldSource } from "@/lib/discrepancy-detector/types";

export const NEEDS_ATTENTION_RING = "border-amber-300 bg-amber-50/60";
const BASE_INPUT =
  "w-full rounded-lg border px-2.5 py-1.5 text-[13px] text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:bg-slate-50 disabled:text-slate-400";
const NEUTRAL = "border-slate-200 bg-white";

export function FieldShell({
  label,
  hint,
  source,
  needsAttention,
  children,
}: {
  label: string;
  hint?: string;
  source?: FieldSource;
  needsAttention?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
        {label}
        {needsAttention && (
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
        )}
        {source === "parsed" && !needsAttention && (
          <span className="rounded bg-slate-100 px-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Pre-filled
          </span>
        )}
      </span>
      {children}
      {hint && <span className="text-[10px] leading-tight text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  source,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  source?: FieldSource;
  placeholder?: string;
}) {
  const needsAttention = value.trim() === "";
  return (
    <FieldShell label={label} hint={hint} source={source} needsAttention={needsAttention}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${BASE_INPUT} ${needsAttention ? NEEDS_ATTENTION_RING : NEUTRAL}`}
      />
    </FieldShell>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  source,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
  source?: FieldSource;
}) {
  const needsAttention = value === null;
  return (
    <FieldShell label={label} hint={hint} source={source} needsAttention={needsAttention}>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "") return onChange(null);
          const n = Number.parseInt(raw, 10);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className={`${BASE_INPUT} ${needsAttention ? NEEDS_ATTENTION_RING : NEUTRAL}`}
      />
    </FieldShell>
  );
}

/**
 * Enumerated fields are picked, never typed — this is what keeps the rules
 * engine's inputs clean. `options` is always the exact vocabulary from ./vocab.
 */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  source,
  placeholder = "Not selected",
}: {
  label: string;
  value: T | null;
  options: readonly T[];
  onChange: (v: T | null) => void;
  hint?: string;
  source?: FieldSource;
  placeholder?: string;
}) {
  const needsAttention = value === null;
  return (
    <FieldShell label={label} hint={hint} source={source} needsAttention={needsAttention}>
      <select
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
        className={`${BASE_INPUT} ${needsAttention ? NEEDS_ATTENTION_RING : NEUTRAL}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/**
 * Presence checkboxes (signatures, dates, consents).
 *
 * These are never pre-filled: whether a client actually signed is not something
 * we will infer from a PDF. The reviewer looks at the page image and says so.
 */
export function CheckField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-brand focus:ring-brand/30"
      />
      <span className="flex flex-col">
        <span className="text-[12px] font-medium leading-tight text-slate-700">{label}</span>
        {hint && <span className="text-[10px] leading-tight text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

export function FieldGroup({
  title,
  description,
  children,
  columns = 2,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <div>
        <h4 className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</h4>
        {description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
      <div className={`grid gap-2.5 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {children}
      </div>
    </section>
  );
}

const TONE = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  deficiency: "bg-rose-50 text-rose-700 ring-rose-200",
  serious: "bg-rose-100 text-rose-800 ring-rose-300",
  note: "bg-sky-50 text-sky-700 ring-sky-200",
  manual: "bg-amber-50 text-amber-700 ring-amber-200",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
} as const;

export function Pill({
  tone,
  children,
}: {
  tone: keyof typeof TONE;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
