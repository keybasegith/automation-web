"use client";

/**
 * The result of the completeness check: signature status at a glance, then
 * every open item grouped by the section it sits in. Each item is a link to its
 * field, so fixing the list is a matter of working down it.
 */

import { AlertTriangle, CheckCircle2, CircleAlert, PenLine, XCircle } from "lucide-react";

import { PLAN_LETTERS, SECTION_TITLES } from "@/lib/naaf/config";
import type { CompletenessReport, NaafIssue, SectionKey } from "@/lib/naaf/completeness";

const SECTION_ORDER: SectionKey[] = ["header", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];

const sectionName = (key: SectionKey): string => {
  if (key === "header") return "Form type";
  const planIndex = (PLAN_LETTERS as readonly string[]).indexOf(key);
  if (planIndex >= 0) return `${key}. Investment Plan (${planIndex + 1})`;
  return `${key}. ${SECTION_TITLES[key as keyof typeof SECTION_TITLES]}`;
};

export interface SignatureStatus {
  label: string;
  signed: boolean;
  dated: boolean;
}

export default function CompletenessPanel({
  report,
  signatures,
  onJump,
}: {
  report: CompletenessReport;
  signatures: SignatureStatus[];
  onJump: (fieldId: string) => void;
}) {
  const grouped = SECTION_ORDER.map((section) => ({
    section,
    items: report.issues.filter((i) => i.section === section),
  })).filter((g) => g.items.length > 0);

  return (
    <section
      aria-labelledby="naaf-check-title"
      className="naaf-no-print mb-4 rounded-[6px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 id="naaf-check-title" className="text-[15px] font-semibold text-slate-900">
            {report.complete ? "No blank boxes or missing signatures" : "Completeness check"}
          </h2>
          <p className="mt-0.5 text-[13px] text-slate-500">
            {report.complete
              ? report.review > 0
                ? `Every required box is filled in. ${report.review} item${report.review === 1 ? "" : "s"} below ${report.review === 1 ? "is" : "are"} optional — confirm ${report.review === 1 ? "it was" : "they were"} left blank on purpose.`
                : "Every box that applies to this application is filled in and signed."
              : "Updates as you fill the form in. Select an item to go to its box."}
          </p>
        </div>
        <ul className="flex flex-wrap gap-1.5 text-[12.5px] font-medium">
          <Count tone="red" n={report.blank} label="blank" />
          <Count tone="red" n={report.signatures} label={report.signatures === 1 ? "signature missing" : "signatures missing"} />
          <Count tone="red" n={report.invalid} label="to correct" />
          <Count tone="amber" n={report.review} label="to confirm" />
        </ul>
      </header>

      {/* Signatures first: the question asked most often of a finished form. */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-2.5">
        {signatures.map((s) => {
          const ok = s.signed && s.dated;
          return (
            <span
              key={s.label}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium ${
                ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {ok ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : <PenLine aria-hidden className="h-3.5 w-3.5" />}
              {s.label}:{" "}
              {ok ? "signed & dated" : !s.signed && !s.dated ? "not signed" : !s.signed ? "signature missing" : "date missing"}
            </span>
          );
        })}
      </div>

      {grouped.length > 0 && (
        <div className="grid gap-x-8 gap-y-3 px-4 py-3 @2xl:grid-cols-2">
          {grouped.map(({ section, items }) => (
            <div key={section}>
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                {sectionName(section)}
              </h3>
              <ul className="mt-1 flex flex-col gap-0.5">
                {items.map((issue) => (
                  <IssueItem key={`${issue.fieldId}-${issue.message}`} issue={issue} onJump={onJump} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Count({ n, label, tone }: { n: number; label: string; tone: "red" | "amber" }) {
  if (n === 0) return null;
  const cls = tone === "red" ? "bg-red-50 text-red-800 ring-red-200" : "bg-amber-50 text-amber-900 ring-amber-200";
  return (
    <li className={`rounded-full px-2.5 py-1 ring-1 ring-inset ${cls}`}>
      <span className="tabular-nums">{n}</span> {label}
    </li>
  );
}

function IssueItem({ issue, onJump }: { issue: NaafIssue; onJump: (fieldId: string) => void }) {
  const Icon =
    issue.kind === "signature" ? PenLine : issue.kind === "invalid" ? XCircle : issue.kind === "review" ? AlertTriangle : CircleAlert;
  const tone = issue.kind === "review" ? "text-amber-800 hover:text-amber-950" : "text-red-700 hover:text-red-900";
  return (
    <li>
      <button
        type="button"
        onClick={() => onJump(issue.fieldId)}
        className={`flex w-full items-start gap-1.5 rounded px-1 py-0.5 text-left text-[13px] underline-offset-2 hover:bg-slate-50 hover:underline ${tone}`}
      >
        <Icon aria-hidden className="mt-[2px] h-3.5 w-3.5 shrink-0" />
        <span>{issue.message}</span>
      </button>
    </li>
  );
}
