import type { ClassificationSource } from "@/lib/document-intake/types";

const LABEL: Record<ClassificationSource, string> = {
  keyword: "Keyword",
  ai: "AI",
  manual: "Manual",
  fallback: "Fallback",
};

const CLS: Record<ClassificationSource, string> = {
  keyword: "bg-slate-100 text-slate-700 ring-slate-200",
  ai: "bg-violet-50 text-violet-700 ring-violet-200",
  manual: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  fallback: "bg-amber-50 text-amber-800 ring-amber-200",
};

export default function SourceBadge({ source }: { source: ClassificationSource }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${CLS[source]}`}
    >
      {LABEL[source]}
    </span>
  );
}
