"use client";

/**
 * Presentation pieces for the digital NAAF.
 *
 * The palette is sampled from public/form-NAAF.pdf so the screen reads as the
 * same document:
 *   blue   #0000E0   labels and body text (the form prints in pure blue)
 *   teal   #006C67   title, side rule
 *   band   #EAF1DD   section bars
 *
 * Every control reads its completeness state from IssueContext, so a field is
 * outlined wherever it sits without the whole form threading props through.
 */

import { createContext, useContext, type ReactNode } from "react";

import type { IssueKind } from "@/lib/naaf/completeness";

export const NAAF_BLUE = "#0000E0";

// ---------------------------------------------------------------- issues

type IssueLookup = (fieldId: string) => IssueKind | undefined;

export const IssueContext = createContext<IssueLookup>(() => undefined);

export const useIssue = (fieldId: string | undefined): IssueKind | undefined => {
  const lookup = useContext(IssueContext);
  return fieldId ? lookup(fieldId) : undefined;
};

/** Outline for a flagged group or signature box. */
export const issueRing = (kind: IssueKind | undefined): string => {
  if (!kind) return "";
  if (kind === "review") return "rounded-[4px] ring-2 ring-amber-400/80 ring-offset-2 bg-amber-50/60";
  return "rounded-[4px] ring-2 ring-red-500/80 ring-offset-2 bg-red-50/60";
};

/** Underline colour for a flagged text box. */
const lineTone = (kind: IssueKind | undefined): string => {
  if (!kind) return "border-[#0000E0]/45 focus-visible:border-[#006C67]";
  if (kind === "review") return "border-amber-500 bg-amber-50";
  return "border-red-500 bg-red-50";
};

// ---------------------------------------------------------------- layout

/** The shaded bar with a heavy border that opens every lettered section. */
export function SectionBar({
  letter,
  title,
  aside,
  id,
  children,
}: {
  letter?: string;
  title: ReactNode;
  aside?: ReactNode;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <div
      id={id}
      className="naaf-bar mt-3 flex scroll-mt-24 flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-2 border-black bg-[#EAF1DD] px-3 py-1.5 shadow-[3px_3px_0_#1f2937] @xl:px-10"
    >
      <h2 className="text-[16px] font-bold text-[#0000E0] @xl:text-[17px]">
        {letter && <span>{letter}.&nbsp; </span>}
        {title}
      </h2>
      {aside && <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{aside}</div>}
      {children}
    </div>
  );
}

/** A bordered section body, as printed below each bar. */
export function SectionBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-t-0 border-slate-500 bg-white px-3 py-3 @xl:px-4 ${className}`}>
      {children}
    </div>
  );
}

/**
 * One row of Sections A/B: the bold side heading and its small print on the
 * left, a teal rule, and the fields on the right. Stacks on narrow screens.
 */
export function SideRow({
  heading,
  note,
  children,
}: {
  heading?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="naaf-side-row grid gap-x-3 gap-y-1 py-2 @2xl:grid-cols-[176px_minmax(0,1fr)]">
      <div className="@2xl:text-right">
        {heading && <p className="text-[15px] font-bold leading-tight text-[#0000E0]">{heading}</p>}
        {note && <div className="mt-1 text-[11.5px] leading-tight text-[#0000E0]">{note}</div>}
      </div>
      <div className="min-w-0 border-[#006C67] @2xl:border-l-[3px] @2xl:pl-3">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------- tick boxes

/** A ☐ box that shows a tick when checked. */
export function TickBox({
  checked,
  onChange,
  label,
  id,
  className = "",
  labelClassName = "",
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  id?: string;
  className?: string;
  labelClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-1.5 text-[#0000E0] ${className}`}>
      <span className="relative flex h-[15px] w-[15px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none border-[1.5px] border-[#0000E0]/80 bg-white transition checked:border-[#0000E0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006C67]"
        />
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none relative h-[13px] w-[13px] text-black opacity-0 peer-checked:opacity-100"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {label !== undefined && <span className={`leading-tight ${labelClassName}`}>{label}</span>}
    </label>
  );
}

/**
 * A row of boxes where one may be ticked. Ticking the ticked box clears it, so
 * a mistaken tick can be undone the way it would be crossed out on paper.
 */
export function TickGroup<T extends string>({
  id,
  legend,
  options,
  value,
  onChange,
  labels,
  className = "",
  itemClassName = "",
}: {
  id: string;
  legend: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  labels?: Partial<Record<T, ReactNode>>;
  className?: string;
  itemClassName?: string;
}) {
  const issue = useIssue(id);
  return (
    <fieldset id={id} className={`scroll-mt-28 ${issueRing(issue)} ${className}`}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
        {options.map((option) => (
          <TickBox
            key={option}
            checked={value === option}
            onChange={(checked) => onChange(checked ? option : null)}
            label={labels?.[option] ?? option}
            className={itemClassName}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Yes / No boxes, as printed beside every question on the form. */
export function YesNoBoxes({
  id,
  legend,
  value,
  onChange,
  yesLabel = "Yes",
  className = "",
}: {
  id: string;
  legend: string;
  value: "Yes" | "No" | null;
  onChange: (value: "Yes" | "No" | null) => void;
  yesLabel?: string;
  className?: string;
}) {
  return (
    <TickGroup
      id={id}
      legend={legend}
      options={["Yes", "No"] as const}
      labels={{ Yes: yesLabel }}
      value={value}
      onChange={onChange}
      className={`inline-block ${className}`}
      itemClassName="text-[14px]"
    />
  );
}

// ---------------------------------------------------------------- text

/** A fill-in rule with its label beside it: "Employer: ________". */
export function LineField({
  id,
  label,
  value,
  onChange,
  className = "",
  inputClassName = "",
  placeholder,
  inputMode,
  type = "text",
  srLabel = false,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
  type?: "text" | "date" | "email" | "tel";
  srLabel?: boolean;
}) {
  const issue = useIssue(id);
  return (
    <div className={`flex min-w-0 items-end gap-2 ${className}`}>
      <label
        htmlFor={id}
        className={srLabel ? "sr-only" : "shrink-0 whitespace-nowrap text-[14.5px] leading-7 text-[#0000E0]"}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        aria-invalid={issue && issue !== "review" ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-7 min-w-0 flex-1 scroll-mt-28 border-0 border-b bg-transparent px-1 text-[15px] text-black outline-none transition placeholder:text-slate-400 ${type === "date" ? "min-w-[9.5rem]" : ""} ${lineTone(issue)} ${inputClassName}`}
      />
    </div>
  );
}

/**
 * The form's "value above, caption below" field — used on the name and
 * address lines, where the caption sits under the rule.
 */
export function CaptionField({
  id,
  caption,
  value,
  onChange,
  className = "",
  placeholder,
  inputMode,
}: {
  id: string;
  caption: ReactNode;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
}) {
  const issue = useIssue(id);
  return (
    <div className={`flex min-w-0 flex-col ${className}`}>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        aria-invalid={issue && issue !== "review" ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-7 w-full min-w-0 scroll-mt-28 border-0 border-b bg-transparent px-1 text-[15px] text-black outline-none transition placeholder:text-slate-400 ${lineTone(issue)}`}
      />
      <label htmlFor={id} className="mt-0.5 text-[13px] leading-tight text-[#0000E0]">
        {caption}
      </label>
    </div>
  );
}

/** A small boxed input, for the Client ID / Plan ID / code boxes. */
export function BoxField({
  id,
  label,
  value,
  onChange,
  className = "",
  srLabel = false,
  inputClassName = "w-40",
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  srLabel?: boolean;
  inputClassName?: string;
}) {
  const issue = useIssue(id);
  const tone = !issue
    ? "border-[#0000E0]/70 focus-visible:border-[#006C67]"
    : issue === "review"
      ? "border-amber-500 bg-amber-50"
      : "border-red-500 bg-red-50";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label
        htmlFor={id}
        className={srLabel ? "sr-only" : "whitespace-nowrap text-[16px] font-bold text-[#0000E0]"}
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        autoComplete="off"
        aria-invalid={issue && issue !== "review" ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 min-w-0 scroll-mt-28 border bg-white px-2 text-[15px] text-black outline-none ring-[#006C67]/30 transition focus-visible:ring-2 ${tone} ${inputClassName}`}
      />
    </div>
  );
}

/** Body copy in the form's blue. */
export function FormText({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-justify text-[14.5px] leading-snug text-[#0000E0] ${className}`}>{children}</p>
  );
}
