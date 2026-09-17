/**
 * Shared presentation pieces for the Client Risk Questionnaire.
 *
 * The palette is sampled from the source PDF rather than borrowed from the
 * dashboard, so the digital form reads as the same document:
 *   dark teal  #0B6165   rules, headings, checkbox marks
 *   band teal  #B5CFD0   section bars
 *   body       #111111   answer and paragraph text
 */

import type { ReactNode } from "react";

export const CRQ_TEAL = "#0B6165";
export const CRQ_BAND = "#B5CFD0";

/**
 * The full-width uppercase section bar, as printed on the form.
 *
 * `startsPrintPage` mirrors the source PDF, where RISK TOLERANCE and RISK
 * PROFILE SUMMARY each open a new sheet. Without it the bar strands itself at
 * the foot of a page, because the section it introduces is taller than the
 * remaining space and cannot be kept with it.
 */
export function SectionBar({
  title,
  id,
  startsPrintPage = false,
}: {
  title: string;
  id?: string;
  startsPrintPage?: boolean;
}) {
  return (
    <div
      id={id}
      className={`crq-section-bar scroll-mt-24 border-y-[3px] border-[#0B6165] bg-[#B5CFD0] px-4 py-2 ${
        startsPrintPage ? "crq-print-page-break" : ""
      }`}
    >
      <h2 className="text-[19px] font-bold uppercase tracking-[0.01em] text-[#0f172a] sm:text-[22px]">
        {title}
      </h2>
    </div>
  );
}

/** A teal question heading, matching the bold teal run-in on the form. */
export function QuestionHeading({
  children,
  as: Tag = "h3",
}: {
  children: ReactNode;
  as?: "h3" | "h4" | "legend";
}) {
  return (
    <Tag className="text-[15px] font-bold leading-snug text-[#0B6165] sm:text-[16px]">
      {children}
    </Tag>
  );
}

/** The "Choose just one option from the list below:" line. */
export function Instruction({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-[14px] leading-snug text-[#333333]">{children}</p>;
}

/** A labelled underline field, echoing the form's fill-in rules. */
export function RuledField({
  id,
  label,
  value,
  onChange,
  invalid = false,
  placeholder,
  className = "",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-[14px] font-semibold text-[#111111]">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full rounded-[4px] border bg-white px-3 text-[16px] text-[#111111] outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0B6165]/35 ${
          invalid
            ? "border-red-500 focus-visible:border-red-600"
            : "border-slate-300 focus-visible:border-[#0B6165]"
        }`}
      />
    </div>
  );
}

/** A date field with the same treatment as RuledField. */
export function DateField({
  id,
  label,
  value,
  onChange,
  invalid = false,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-[14px] font-semibold text-[#111111]">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="date"
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full rounded-[4px] border bg-white px-3 text-[16px] text-[#111111] outline-none transition focus-visible:ring-2 focus-visible:ring-[#0B6165]/35 ${
          value ? "" : "crq-no-print"
        } ${
          invalid
            ? "border-red-500 focus-visible:border-red-600"
            : "border-slate-300 focus-visible:border-[#0B6165]"
        }`}
      />
      {/* An empty date prints as a rule to sign against, not as "yyyy-mm-dd". */}
      {!value && (
        <div aria-hidden className="crq-print-only hidden h-9 w-full border-b border-[#111111]" />
      )}
    </div>
  );
}

/** Inline error text tied to a control via aria-describedby. */
export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} role="alert" className="crq-no-print mt-1.5 text-[13px] font-medium text-red-600">
      {message}
    </p>
  );
}
