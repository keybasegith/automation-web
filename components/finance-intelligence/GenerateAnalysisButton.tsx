"use client";

import { Download } from "lucide-react";

interface Props {
  onGenerate: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

export default function GenerateAnalysisButton({
  onGenerate,
  isGenerating,
  disabled,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled || isGenerating}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {isGenerating ? "Generating…" : "Generate & Download Excel"}
      </button>
      <p className="text-xs text-slate-500">
        Produces a styled .xlsx file containing opening balance, monthly
        movements, and the ending balance.
      </p>
    </div>
  );
}
