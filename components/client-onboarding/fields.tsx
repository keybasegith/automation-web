"use client";

/**
 * Field primitives for the onboarding wizard.
 *
 * Plain, modern controls — the wizard is a data-entry flow, not the paper
 * form. Each control takes the same DOM id the digital NAAF / CRQ uses for
 * that box, so the completeness findings (keyed by those ids) highlight the
 * right control here too, and "go to" links land on it.
 */

import { createContext, useContext, type ReactNode } from "react";

// ---------------------------------------------------------------- findings

type Lookup = (fieldId: string) => { kind: "blank" | "signature" | "invalid" | "review"; message: string } | undefined;

/** Supplied by the wizard for the current step once its findings should show. */
export const FindingContext = createContext<Lookup>(() => undefined);

const useFinding = (id: string | undefined) => {
  const lookup = useContext(FindingContext);
  return id ? lookup(id) : undefined;
};

function FindingText({ id }: { id: string }) {
  const finding = useFinding(id);
  if (!finding) return null;
  return (
    <p
      id={`${id}-finding`}
      className={`mt-1 text-[12.5px] ${finding.kind === "review" ? "text-amber-700" : "text-red-600"}`}
    >
      {finding.message}
    </p>
  );
}

const inputTone = (kind: string | undefined) =>
  !kind
    ? "border-slate-300 focus-visible:border-[#0B6165] focus-visible:ring-[#0B6165]/25"
    : kind === "review"
      ? "border-amber-400 focus-visible:ring-amber-300/40"
      : "border-red-400 bg-red-50/40 focus-visible:ring-red-300/40";

// ---------------------------------------------------------------- layout

export function Section({ title, description, children }: { title?: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[10px] border border-slate-200 bg-white p-4 @xl:p-5">
      {title && <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>}
      {description && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{description}</p>}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

/** A responsive grid of fields. */
export function Grid({ cols = 2, children }: { cols?: 1 | 2 | 3 | 4; children: ReactNode }) {
  const map = { 1: "", 2: "@xl:grid-cols-2", 3: "@xl:grid-cols-2 @3xl:grid-cols-3", 4: "@xl:grid-cols-2 @3xl:grid-cols-4" };
  return <div className={`grid gap-x-4 gap-y-4 ${map[cols]}`}>{children}</div>;
}

function Label({ htmlFor, label, optional }: { htmlFor?: string; label: ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-medium text-slate-700">
      {label}
      {optional && <span className="ml-1 font-normal text-slate-400">(optional)</span>}
    </label>
  );
}

// ---------------------------------------------------------------- inputs

export function TextInput({
  id,
  label,
  value,
  onChange,
  optional,
  placeholder,
  hint,
  type = "text",
  inputMode,
  autoComplete = "off",
  className = "",
  disabled,
  prefix,
  list,
}: {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  /** Shown inside the box before the value, e.g. "$". */
  prefix?: string;
  /** id of a <datalist> of suggestions. */
  list?: string;
  optional?: boolean;
  placeholder?: string;
  hint?: string;
  type?: "text" | "email" | "tel" | "date";
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email";
  autoComplete?: string;
  className?: string;
  disabled?: boolean;
}) {
  const finding = useFinding(id);
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} optional={optional} />
      <div className="relative">
      {prefix && (
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-slate-400">
          {prefix}
        </span>
      )}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        disabled={disabled}
        list={list}
        aria-invalid={finding && finding.kind !== "review" ? true : undefined}
        aria-describedby={finding ? `${id}-finding` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full scroll-mt-32 rounded-[7px] border bg-white px-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus-visible:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${prefix ? "pl-6" : ""} ${inputTone(finding?.kind)}`}
      />
      </div>
      {hint && !finding && <p className="mt-1 text-[12px] text-slate-500">{hint}</p>}
      <FindingText id={id} />
    </div>
  );
}

export function MoneyInput(props: Omit<Parameters<typeof TextInput>[0], "inputMode" | "prefix">) {
  return <TextInput {...props} inputMode="decimal" prefix="$" placeholder={props.placeholder ?? "0"} />;
}

export function Select<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  optional,
  placeholder = "Select…",
  labels,
  className = "",
}: {
  id: string;
  label: ReactNode;
  value: T | null;
  options: readonly T[];
  onChange: (value: T | null) => void;
  optional?: boolean;
  placeholder?: string;
  labels?: Partial<Record<T, string>>;
  className?: string;
}) {
  const finding = useFinding(id);
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} optional={optional} />
      <select
        id={id}
        name={id}
        value={value ?? ""}
        aria-invalid={finding && finding.kind !== "review" ? true : undefined}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
        className={`h-10 w-full scroll-mt-32 rounded-[7px] border bg-white px-2.5 text-[15px] text-slate-900 outline-none transition focus-visible:ring-4 ${inputTone(finding?.kind)}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
      <FindingText id={id} />
    </div>
  );
}

/** Pill buttons for a short single choice. Choosing the chosen one clears it. */
export function Choice<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  labels,
  optional,
  className = "",
}: {
  id: string;
  label?: ReactNode;
  value: T | null;
  options: readonly T[];
  onChange: (value: T | null) => void;
  labels?: Partial<Record<T, ReactNode>>;
  optional?: boolean;
  className?: string;
}) {
  const finding = useFinding(id);
  return (
    <div className={className}>
      {label && <Label label={label} optional={optional} />}
      <div
        id={id}
        role="radiogroup"
        aria-label={typeof label === "string" ? label : undefined}
        className={`flex scroll-mt-32 flex-wrap gap-1.5 rounded-[8px] ${
          finding && finding.kind !== "review" ? "ring-2 ring-red-300 ring-offset-2" : ""
        }`}
      >
        {options.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? null : option)}
              className={`min-h-9 rounded-[7px] border px-3 py-1.5 text-left text-[14px] font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B6165]/25 ${
                selected
                  ? "border-[#0B6165] bg-[#0B6165] text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              {labels?.[option] ?? option}
            </button>
          );
        })}
      </div>
      <FindingText id={id} />
    </div>
  );
}

export function YesNo({
  id,
  label,
  value,
  onChange,
  className = "",
}: {
  id: string;
  label: ReactNode;
  value: "Yes" | "No" | null;
  onChange: (value: "Yes" | "No" | null) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 @xl:flex-row @xl:items-center @xl:justify-between ${className}`}>
      <p className="text-[14px] leading-snug text-slate-700">{label}</p>
      <Choice id={id} value={value} options={["Yes", "No"] as const} onChange={onChange} className="shrink-0" />
    </div>
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  children,
  className = "",
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  const finding = useFinding(id);
  return (
    <div className={className}>
      <label className="flex cursor-pointer items-start gap-2.5 text-[14px] leading-snug text-slate-700">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 scroll-mt-32 rounded border-slate-300 accent-[#0B6165]"
        />
        <span>{children}</span>
      </label>
      {id && finding && <FindingText id={id} />}
    </div>
  );
}

/** Several independent ticks, as one labelled group. */
export function CheckboxGroup<T extends string>({
  id,
  label,
  options,
  values,
  onChange,
}: {
  id: string;
  label: ReactNode;
  options: readonly T[];
  values: readonly T[];
  onChange: (values: T[]) => void;
}) {
  const finding = useFinding(id);
  return (
    <fieldset id={id} className="scroll-mt-32">
      <legend className="mb-1.5 text-[13px] font-medium text-slate-700">{label}</legend>
      <div
        className={`flex flex-wrap gap-1.5 rounded-[8px] ${
          finding && finding.kind !== "review" ? "ring-2 ring-red-300 ring-offset-2" : ""
        }`}
      >
        {options.map((option) => {
          const on = values.includes(option);
          return (
            <label
              key={option}
              className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-[7px] border px-3 py-1.5 text-[14px] transition ${
                on ? "border-[#0B6165] bg-[#EEF5F5] text-[#0B6165]" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => onChange(e.target.checked ? [...values, option] : values.filter((v) => v !== option))}
                className="h-4 w-4 accent-[#0B6165]"
              />
              {option}
            </label>
          );
        })}
      </div>
      <FindingText id={id} />
    </fieldset>
  );
}

/** A note that a value here is also written into the other form. */
export function FillsNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#EEF5F5] px-2.5 py-0.5 text-[12px] font-medium text-[#0B6165]">
      {children}
    </p>
  );
}
