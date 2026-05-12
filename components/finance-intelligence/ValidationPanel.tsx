"use client";

import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { formatAmount } from "@/lib/finance-intelligence/parseAmounts";
import type { ValidationStatus } from "@/lib/finance-intelligence/types";

interface Props {
  status: ValidationStatus;
  sageEndingBalance?: number;
  generatedEndingBalance: number;
  difference?: number;
}

const STATUS_META: Record<
  ValidationStatus,
  {
    label: string;
    badgeClass: string;
    icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  matched: {
    label: "Matched",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  review_required: {
    label: "Review Required",
    badgeClass: "bg-amber-50 text-amber-800 ring-amber-200",
    icon: AlertTriangle,
    iconClass: "text-amber-600",
  },
  missing_sage_ending_balance: {
    label: "Missing Sage Ending Balance",
    badgeClass: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: HelpCircle,
    iconClass: "text-slate-500",
  },
};

function MetricCell({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 tabular-nums ${
          emphasize
            ? "text-lg font-semibold text-slate-900"
            : "text-sm font-medium text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default function ValidationPanel({
  status,
  sageEndingBalance,
  generatedEndingBalance,
  difference,
}: Props) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Validation
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Compares the generated ending balance against the Sage 300 export.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${meta.badgeClass}`}
        >
          <Icon className={`h-3.5 w-3.5 ${meta.iconClass}`} />
          {meta.label}
        </span>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCell
          label="Sage Ending Balance"
          value={sageEndingBalance !== undefined ? formatAmount(sageEndingBalance) : "—"}
        />
        <MetricCell
          label="Generated Ending Balance"
          value={formatAmount(generatedEndingBalance)}
          emphasize
        />
        <MetricCell
          label="Difference"
          value={difference !== undefined ? formatAmount(difference) : "—"}
        />
        <MetricCell label="Status" value={meta.label} />
      </div>
    </section>
  );
}
