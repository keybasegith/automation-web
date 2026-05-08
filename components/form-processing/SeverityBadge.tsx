import type { FlagSeverity } from "@/lib/forms/types";

const CLS: Record<FlagSeverity, string> = {
  Low: "bg-slate-100 text-slate-700 ring-slate-200",
  Medium: "bg-amber-50 text-amber-800 ring-amber-200",
  High: "bg-red-50 text-red-700 ring-red-200",
};

export default function SeverityBadge({ severity }: { severity: FlagSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${CLS[severity]}`}
    >
      {severity}
    </span>
  );
}
