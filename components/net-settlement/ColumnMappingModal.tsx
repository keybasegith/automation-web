"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ParsedSheet } from "@/lib/net-settlement/parse";
import type { ResolvedMapping } from "@/lib/net-settlement/normalize";

export interface FieldOption {
  value: string;
  label: string;
  required?: boolean;
}

export default function ColumnMappingModal({
  title,
  sheet,
  mapping,
  fields,
  onClose,
  onConfirm,
}: {
  title: string;
  sheet: ParsedSheet;
  mapping: ResolvedMapping;
  fields: FieldOption[];
  onClose: () => void;
  onConfirm: (mapping: ResolvedMapping) => void;
}) {
  // header index -> selected field key ("" = ignore)
  const initial: Record<number, string> = {};
  sheet.headers.forEach((_, i) => {
    const field = Object.entries(mapping.field).find(([, idx]) => idx === i)?.[0];
    initial[i] = field ?? "";
  });
  const [sel, setSel] = useState<Record<number, string>>(initial);
  const sample = sheet.rows[0]?.cells ?? {};

  const confidenceFor = (i: number): string => {
    const field = Object.entries(mapping.field).find(([, idx]) => idx === i)?.[0];
    return field ? mapping.confidence[field] ?? "—" : "—";
  };

  const missing = fields
    .filter((f) => f.required)
    .filter((f) => !Object.values(sel).includes(f.value))
    .map((f) => f.label);

  function confirm() {
    const field: Record<string, number> = {};
    const confidence: Record<string, "high" | "medium" | "low"> = {};
    for (const [i, key] of Object.entries(sel)) {
      if (key) {
        field[key] = Number(i);
        confidence[key] = "high";
      }
    }
    const unmapped = sheet.headers.filter((_, i) => !sel[i]);
    onConfirm({ field, confidence, unmapped });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Map {title} columns</h3>
            <p className="text-[12px] text-slate-500">Confirm how each column maps to a system field.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full text-left text-[12.5px]">
            <thead className="text-[10.5px] uppercase text-slate-500">
              <tr>
                <th className="py-1.5 font-medium">Source column</th>
                <th className="py-1.5 font-medium">Sample</th>
                <th className="py-1.5 font-medium">Confidence</th>
                <th className="py-1.5 font-medium">System field</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline)]">
              {sheet.headers.map((h, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3 font-medium text-slate-800">{h}</td>
                  <td className="py-2 pr-3 text-slate-500">{String(sample[h] ?? "").slice(0, 20)}</td>
                  <td className="py-2 pr-3 capitalize text-slate-500">{confidenceFor(i)}</td>
                  <td className="py-2">
                    <select
                      value={sel[i] ?? ""}
                      onChange={(e) => setSel((s) => ({ ...s, [i]: e.target.value }))}
                      className="h-8 w-full rounded-lg border border-[var(--hairline)] px-2 text-[12px]"
                    >
                      <option value="">— ignore —</option>
                      {fields.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}{f.required ? " *" : ""}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-[var(--hairline)] px-5 py-3.5">
          <span className="text-[12px] text-rose-600">
            {missing.length > 0 ? `Missing required: ${missing.join(", ")}` : ""}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 rounded-lg border border-[var(--hairline)] px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              onClick={confirm}
              disabled={missing.length > 0}
              className="h-9 rounded-lg bg-brand px-4 text-[13px] font-medium text-white hover:bg-brand-hover disabled:opacity-40"
            >
              Apply mapping & compare
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
