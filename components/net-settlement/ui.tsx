import type { MatchStatus, ExceptionSeverity } from "@/lib/net-settlement/types";
import { formatMoney } from "@/lib/net-settlement/money";

export { formatMoney };

const MATCH_TONE: Record<string, string> = {
  EXACT_MATCH: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REFERENCE_MATCH: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  COMPOSITE_MATCH: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  AGGREGATE_MATCH: "bg-teal-50 text-teal-700 ring-teal-200",
  PROBABLE_MATCH: "bg-amber-50 text-amber-700 ring-amber-200",
  READY_FOR_SETTLEMENT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  UNMATCHED_FUNDSERV: "bg-rose-50 text-rose-700 ring-rose-200",
  UNMATCHED_WINFUND: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const cls = MATCH_TONE[status] ?? "bg-rose-50 text-rose-700 ring-rose-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const SEVERITY_TONE: Record<ExceptionSeverity, string> = {
  critical: "bg-rose-100 text-rose-800 ring-rose-300",
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function SeverityBadge({ severity }: { severity: ExceptionSeverity }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${SEVERITY_TONE[severity]}`}>
      {severity}
    </span>
  );
}

export function SummaryCard({
  label,
  value,
  tone = "default",
  emphasis = false,
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warn" | "good";
  emphasis?: boolean;
}) {
  const valueTone =
    tone === "warn" ? "text-rose-600" : tone === "good" ? "text-emerald-600" : "text-slate-900";
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
        emphasis ? "border-brand/30 ring-1 ring-brand/10" : "border-[var(--hairline)]"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">{label}</p>
      <p className={`mt-1.5 font-display text-[24px] font-semibold tabular-nums ${valueTone}`}>{value}</p>
    </div>
  );
}
