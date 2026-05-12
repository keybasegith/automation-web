"use client";

import { FileSpreadsheet } from "lucide-react";

interface Props {
  onStart: () => void;
}

export default function FinanceIntelligenceLandingCard({ onStart }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
            Monthly Account Analysis Generator
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Upload a Sage 300 export, select an account, validate balances, and
            download a formatted Excel analysis.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Files are processed internally and are not sent to external AI
            services.
          </p>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          Start Analysis
        </button>
      </div>
    </section>
  );
}
