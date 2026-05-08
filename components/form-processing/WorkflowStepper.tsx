import type { SubmissionStatus } from "@/lib/forms/types";

interface Step {
  id: number;
  label: string;
  /** Highest submission status that counts as "done" for this step. */
  doneAt: readonly SubmissionStatus[];
}

const STEPS: readonly Step[] = [
  {
    id: 1,
    label: "Upload NAAF",
    doneAt: [
      "extraction_completed",
      "kyc_draft_created",
      "crq_draft_created",
      "ready_for_consistency_check",
      "submitted_to_compliance",
      "returned_to_advisor",
      "clarification_requested",
      "approved_by_compliance",
      "sent_to_bp",
      "pushed_to_windfund",
      "rejected_by_compliance",
    ],
  },
  {
    id: 2,
    label: "Review extracted data",
    doneAt: [
      "kyc_draft_created",
      "crq_draft_created",
      "ready_for_consistency_check",
      "submitted_to_compliance",
      "returned_to_advisor",
      "clarification_requested",
      "approved_by_compliance",
      "sent_to_bp",
      "pushed_to_windfund",
      "rejected_by_compliance",
    ],
  },
  {
    id: 3,
    label: "Generate KYC",
    doneAt: [
      "crq_draft_created",
      "ready_for_consistency_check",
      "submitted_to_compliance",
      "returned_to_advisor",
      "clarification_requested",
      "approved_by_compliance",
      "sent_to_bp",
      "pushed_to_windfund",
      "rejected_by_compliance",
    ],
  },
  {
    id: 4,
    label: "Generate CRQ",
    doneAt: [
      "ready_for_consistency_check",
      "submitted_to_compliance",
      "returned_to_advisor",
      "clarification_requested",
      "approved_by_compliance",
      "sent_to_bp",
      "pushed_to_windfund",
      "rejected_by_compliance",
    ],
  },
  {
    id: 5,
    label: "Run consistency check",
    doneAt: [
      "submitted_to_compliance",
      "returned_to_advisor",
      "clarification_requested",
      "approved_by_compliance",
      "sent_to_bp",
      "pushed_to_windfund",
      "rejected_by_compliance",
    ],
  },
  {
    id: 6,
    label: "Submit to compliance",
    doneAt: [
      "approved_by_compliance",
      "sent_to_bp",
      "pushed_to_windfund",
      "rejected_by_compliance",
    ],
  },
  {
    id: 7,
    label: "BP / WindFund processing",
    doneAt: ["pushed_to_windfund"],
  },
];

export default function WorkflowStepper({
  status,
}: {
  status?: SubmissionStatus | null;
}) {
  return (
    <ol className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-7 sm:gap-3 sm:p-5">
      {STEPS.map((step) => {
        const done =
          status !== undefined &&
          status !== null &&
          step.doneAt.includes(status);
        return (
          <li
            key={step.id}
            className={`flex flex-col items-start gap-1 rounded-xl border p-3 ${
              done
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-200 bg-slate-50/40"
            }`}
          >
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider ${
                done ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              Step {step.id}
            </span>
            <span
              className={`text-xs font-medium leading-snug ${
                done ? "text-emerald-900" : "text-slate-700"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
