import type { OnboardingStatus } from "@/lib/onboarding";

const STATUS_STYLES: Record<OnboardingStatus, { label: string; cls: string }> = {
  draft: {
    label: "Draft",
    cls: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  in_progress: {
    label: "In progress",
    cls: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  sent: {
    label: "Sent",
    cls: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  signed: {
    label: "Signed",
    cls: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
};

export default function StatusBadge({ status }: { status: OnboardingStatus }) {
  const meta = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}
