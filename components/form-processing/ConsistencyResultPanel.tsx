import SeverityBadge from "@/components/form-processing/SeverityBadge";
import {
  FLAG_CATEGORY_LABELS,
  OVERALL_STATUS_LABELS,
  type ConsistencyCheckResult,
} from "@/lib/forms/types";

const STATUS_CLS: Record<string, string> = {
  no_issues_detected: "border-emerald-200 bg-emerald-50 text-emerald-800",
  needs_advisor_review: "border-amber-200 bg-amber-50 text-amber-900",
  needs_compliance_review: "border-red-200 bg-red-50 text-red-800",
  blocked_missing_required: "border-red-300 bg-red-50 text-red-900",
};

export default function ConsistencyResultPanel({
  result,
}: {
  result: ConsistencyCheckResult;
}) {
  const overallCls = STATUS_CLS[result.overallStatus] ?? STATUS_CLS.no_issues_detected;
  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        className={`rounded-2xl border px-5 py-4 text-sm font-medium ${overallCls}`}
      >
        Overall: {OVERALL_STATUS_LABELS[result.overallStatus]}
      </div>

      {result.flags.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          No mismatches were detected. The advisor still owns final review.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.flags.map((flag) => (
            <li
              key={flag.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {FLAG_CATEGORY_LABELS[flag.category]}
                </span>
                <SeverityBadge severity={flag.severity} />
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <FieldValue label="KYC field" name={flag.kycField} value={flag.kycValue} />
                <FieldValue label="CRQ field" name={flag.crqField} value={flag.crqValue} />
              </div>
              <p className="mt-3 text-sm text-slate-700">{flag.explanation}</p>
              <p className="mt-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  Recommended human action:
                </span>{" "}
                {flag.recommendedHumanAction}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FieldValue({
  label,
  name,
  value,
}: {
  label: string;
  name: string | null;
  value: string | null;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-xs text-slate-500">{name ?? "—"}</p>
      <p className="mt-1 text-sm text-slate-900">
        {value ?? <span className="italic text-slate-400">missing</span>}
      </p>
    </div>
  );
}
