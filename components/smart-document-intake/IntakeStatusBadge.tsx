import type { DocumentGroupStatus } from "@/lib/document-intake/types";

const STATUS_CLS: Record<DocumentGroupStatus, string> = {
  Ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Needs Review": "bg-amber-50 text-amber-800 ring-amber-200",
  "Low Confidence": "bg-red-50 text-red-700 ring-red-200",
  Unsure: "bg-orange-50 text-orange-800 ring-orange-200",
  Unknown: "bg-red-50 text-red-700 ring-red-200",
};

export default function IntakeStatusBadge({
  status,
}: {
  status: DocumentGroupStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_CLS[status]}`}
    >
      {status}
    </span>
  );
}
