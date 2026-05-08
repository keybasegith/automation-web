import {
  SUBMISSION_STATUS_LABELS,
  type SubmissionStatus,
} from "@/lib/forms/types";

const STATUS_CLS: Record<SubmissionStatus, string> = {
  naaf_uploaded: "bg-slate-100 text-slate-700 ring-slate-200",
  extraction_completed: "bg-slate-100 text-slate-700 ring-slate-200",
  kyc_draft_created: "bg-slate-100 text-slate-700 ring-slate-200",
  crq_draft_created: "bg-slate-100 text-slate-700 ring-slate-200",
  ready_for_consistency_check: "bg-amber-50 text-amber-800 ring-amber-200",
  submitted_to_compliance: "bg-violet-50 text-violet-700 ring-violet-200",
  returned_to_advisor: "bg-amber-50 text-amber-800 ring-amber-200",
  clarification_requested: "bg-amber-50 text-amber-800 ring-amber-200",
  approved_by_compliance: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected_by_compliance: "bg-red-50 text-red-700 ring-red-200",
  sent_to_bp: "bg-blue-50 text-blue-700 ring-blue-200",
  pushed_to_windfund: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export default function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_CLS[status]}`}
    >
      {SUBMISSION_STATUS_LABELS[status]}
    </span>
  );
}
