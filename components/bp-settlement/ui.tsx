import type { MismatchStatus, OverallStatus } from "@/lib/bp-settlement/types";

/** Format integer cents as a CAD string, e.g. -50000 -> "-$500.00". */
export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const neg = cents < 0;
  const abs = Math.abs(cents);
  return `${neg ? "-" : ""}$${Math.floor(abs / 100).toLocaleString("en-CA")}.${String(abs % 100).padStart(2, "0")}`;
}

const MATCH_TONE: Record<MismatchStatus, string> = {
  EXACT_MATCH: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  MISSING_IN_WINFUND: "bg-rose-50 text-rose-700 ring-rose-200",
  EXTRA_IN_WINFUND: "bg-rose-50 text-rose-700 ring-rose-200",
  AMOUNT_MISMATCH: "bg-rose-50 text-rose-700 ring-rose-200",
  WRONG_SETTLEMENT_DATE: "bg-amber-50 text-amber-700 ring-amber-200",
  WRONG_TRANSACTION_TYPE: "bg-rose-50 text-rose-700 ring-rose-200",
  DUPLICATE_IN_WINFUND: "bg-rose-100 text-rose-800 ring-rose-300",
  DUPLICATE_IN_FUNDSERV: "bg-rose-100 text-rose-800 ring-rose-300",
  WRONG_STATUS: "bg-amber-50 text-amber-700 ring-amber-200",
  LOW_EXTRACTION_CONFIDENCE: "bg-slate-100 text-slate-600 ring-slate-200",
  MANUAL_REVIEW: "bg-slate-100 text-slate-600 ring-slate-200",
};

function titleCase(s: string): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function MatchStatusBadge({ status }: { status: MismatchStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${MATCH_TONE[status]}`}>
      {titleCase(status)}
    </span>
  );
}

const OVERALL_TONE: Record<OverallStatus, string> = {
  MATCHED: "bg-emerald-600 text-white ring-emerald-600",
  BUY_MISMATCH: "bg-rose-50 text-rose-700 ring-rose-200",
  SELL_MISMATCH: "bg-rose-50 text-rose-700 ring-rose-200",
  BUY_AND_SELL_MISMATCH: "bg-rose-100 text-rose-800 ring-rose-300",
  FILE_REVIEW_REQUIRED: "bg-amber-50 text-amber-700 ring-amber-200",
};

const OVERALL_LABEL: Record<OverallStatus, string> = {
  MATCHED: "Matched",
  BUY_MISMATCH: "Buy Mismatch",
  SELL_MISMATCH: "Sell Mismatch",
  BUY_AND_SELL_MISMATCH: "Buy and Sell Mismatch",
  FILE_REVIEW_REQUIRED: "File Review Required",
};

export function OverallStatusBadge({ status }: { status: OverallStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ring-inset ${OVERALL_TONE[status]}`}>
      {OVERALL_LABEL[status]}
    </span>
  );
}
