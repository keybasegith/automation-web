import {
  FIELD_SOURCE_LABELS,
  type FieldSource,
} from "@/lib/forms/types";

const CLS: Record<FieldSource, string> = {
  extracted: "bg-slate-100 text-slate-700 ring-slate-200",
  needs_review: "bg-amber-50 text-amber-800 ring-amber-200",
  missing: "bg-red-50 text-red-700 ring-red-200",
  manually_edited: "bg-blue-50 text-blue-700 ring-blue-200",
  auto_filled_from_naaf: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  manually_entered: "bg-blue-50 text-blue-700 ring-blue-200",
  suggested_needs_review: "bg-amber-50 text-amber-800 ring-amber-200",
};

export default function FieldSourceBadge({
  source,
}: {
  source: FieldSource | undefined;
}) {
  const s: FieldSource = source ?? "missing";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CLS[s]}`}
    >
      {FIELD_SOURCE_LABELS[s]}
    </span>
  );
}
