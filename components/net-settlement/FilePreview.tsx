"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Table2 } from "lucide-react";
import type { ParsedSheet } from "@/lib/net-settlement/parse";
import type { ResolvedMapping } from "@/lib/net-settlement/normalize";
import type { FieldOption } from "@/components/net-settlement/ColumnMappingModal";

export interface PreviewSource {
  id: string;
  label: string;
  fileName: string;
  kind: string;
  sheet: ParsedSheet;
  /** Used to badge the columns the reconciliation actually reads. */
  mapping?: ResolvedMapping;
  fields?: FieldOption[];
}

const PAGE = 25;

/** Header index -> the normalized field label it was mapped to. */
function columnLabels(mapping?: ResolvedMapping, fields?: FieldOption[]): Record<number, string> {
  const out: Record<number, string> = {};
  if (!mapping) return out;
  for (const [field, idx] of Object.entries(mapping.field)) {
    out[idx] = fields?.find((f) => f.value === field)?.label ?? field;
  }
  return out;
}

function cellText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export default function FilePreview({ sources }: { sources: PreviewSource[] }) {
  const [activeId, setActiveId] = useState(sources[0]?.id ?? "");
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState(PAGE);

  const active = sources.find((s) => s.id === activeId) ?? sources[0];

  // Fall back to a live tab when the selected file is removed or replaced.
  useEffect(() => {
    if (!sources.some((s) => s.id === activeId)) setActiveId(sources[0]?.id ?? "");
  }, [sources, activeId]);
  useEffect(() => setShown(PAGE), [activeId, active?.fileName]);

  if (!active) return null;

  const { sheet } = active;
  const labels = columnLabels(active.mapping, active.fields);
  const rows = sheet.rows.slice(0, shown);

  return (
    <section className="mt-6 rounded-2xl border border-[var(--hairline)] bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] px-4 py-3">
        <Table2 className="h-4 w-4 text-slate-400" />
        <h2 className="text-[13px] font-semibold text-slate-900">File preview</h2>

        {sources.length > 1 && (
          <div className="ml-2 flex gap-1 rounded-lg bg-slate-100 p-0.5">
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                  s.id === active.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <span className="ml-auto truncate text-[12px] text-slate-400">
          {active.fileName} · {sheet.name} · {sheet.headers.length} columns · {sheet.rows.length} rows
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-slate-500 hover:bg-slate-50"
        >
          {open ? "Hide" : "Show"}
          <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </header>

      {open && (
        <>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10.5px] uppercase text-slate-500">
                <tr>
                  <th className="w-12 px-2.5 py-2 text-right font-medium">#</th>
                  {sheet.headers.map((h, i) => (
                    <th key={`${h}-${i}`} className="whitespace-nowrap px-2.5 py-2 font-medium">
                      <span className={labels[i] ? "text-slate-700" : ""}>{h}</span>
                      {labels[i] && (
                        <span className="ml-1.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[9px] font-medium normal-case text-brand">
                          {labels[i]}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline)]">
                {rows.map((r) => (
                  <tr key={r.rowNumber} className="hover:bg-slate-50/70">
                    <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-300">{r.rowNumber}</td>
                    {sheet.headers.map((h, i) => (
                      <td
                        key={`${h}-${i}`}
                        className={`max-w-[220px] truncate whitespace-nowrap px-2.5 py-1.5 ${
                          labels[i] ? "font-medium text-slate-800" : "text-slate-500"
                        }`}
                        title={cellText(r.cells[h])}
                      >
                        {cellText(r.cells[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="flex items-center gap-3 border-t border-[var(--hairline)] px-4 py-2.5">
            <span className="text-[11.5px] text-slate-400">
              Showing {rows.length} of {sheet.rows.length} rows
            </span>
            {shown < sheet.rows.length && (
              <button
                onClick={() => setShown((n) => n + PAGE * 4)}
                className="ml-auto text-[12px] font-medium text-brand hover:underline"
              >
                Show more
              </button>
            )}
          </footer>
        </>
      )}
    </section>
  );
}
