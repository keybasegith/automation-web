"use client";

import { CRQ_FORMS, CRQ_VARIANTS } from "@/lib/risk-questionnaire/forms";
import type { CrqVariant } from "@/lib/risk-questionnaire/types";

/** Segmented control for the three CRQ editions. */
export default function CrqVariantPicker({
  value,
  onChange,
  className = "",
}: {
  value: CrqVariant;
  onChange: (variant: CrqVariant) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Questionnaire type"
      className={`crq-no-print inline-flex rounded-[7px] border border-slate-200 bg-slate-50 p-0.5 ${className}`}
    >
      {CRQ_VARIANTS.map((variant) => {
        const selected = variant === value;
        return (
          <button
            key={variant}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(variant)}
            className={`rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition ${
              selected ? "bg-[#0B6165] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"
            }`}
          >
            {CRQ_FORMS[variant].label}
          </button>
        );
      })}
    </div>
  );
}
