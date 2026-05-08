"use client";

import FieldSourceBadge from "@/components/form-processing/FieldSourceBadge";
import { maskSIN } from "@/lib/security/maskSensitive";
import type { FieldSource } from "@/lib/forms/types";

export interface FieldDef<K extends string = string> {
  key: K;
  label: string;
  /** "text" by default; "textarea" for multi-line; "masked-sin" for SIN. */
  kind?: "text" | "textarea" | "masked-sin" | "date" | "email" | "tel" | "number";
  required?: boolean;
}

export interface FieldGroup<K extends string = string> {
  title: string;
  fields: readonly FieldDef<K>[];
}

export interface FieldGroupEditorProps<K extends string = string> {
  groups: readonly FieldGroup<K>[];
  values: Record<K, string>;
  sourceMap: Partial<Record<K, FieldSource>>;
  confidenceMap?: Partial<Record<K, number>>;
  onChange: (key: K, value: string) => void;
  disabled?: boolean;
}

export default function FieldGroupEditor<K extends string>({
  groups,
  values,
  sourceMap,
  confidenceMap,
  onChange,
  disabled,
}: FieldGroupEditorProps<K>) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section
          key={group.title}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand">
            {group.title}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((f) => {
              const value = values[f.key] ?? "";
              const source = sourceMap[f.key];
              const confidence = confidenceMap?.[f.key];
              return (
                <FieldRow
                  key={f.key}
                  def={f}
                  value={value}
                  source={source}
                  confidence={confidence}
                  disabled={disabled}
                  onChange={(v) => onChange(f.key, v)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

interface FieldRowProps<K extends string> {
  def: FieldDef<K>;
  value: string;
  source: FieldSource | undefined;
  confidence?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function FieldRow<K extends string>({
  def,
  value,
  source,
  confidence,
  disabled,
  onChange,
}: FieldRowProps<K>) {
  const inputType =
    def.kind === "date"
      ? "date"
      : def.kind === "email"
        ? "email"
        : def.kind === "tel"
          ? "tel"
          : def.kind === "number"
            ? "number"
            : "text";
  const isTextarea = def.kind === "textarea";
  const isSin = def.kind === "masked-sin";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
        {def.label}
        {def.required && <span className="text-red-600">*</span>}
        <FieldSourceBadge source={source} />
        {confidence !== undefined && confidence > 0 && (
          <span className="text-[10px] text-slate-400">
            confidence {Math.round(confidence * 100)}%
          </span>
        )}
      </span>
      {isTextarea ? (
        <textarea
          value={value}
          rows={3}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600"
        />
      ) : isSin ? (
        <div className="flex items-center gap-2">
          <input
            type="password"
            autoComplete="off"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <span className="text-[11px] text-slate-500" title="Masked preview">
            {maskSIN(value)}
          </span>
        </div>
      ) : (
        <input
          type={inputType}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600"
        />
      )}
    </label>
  );
}
