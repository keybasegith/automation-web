"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { parsePastedTable, type ParsedSheet } from "@/lib/net-settlement/parse";

export default function PasteTableModal({
  title,
  onClose,
  onImport,
}: {
  title: string;
  onClose: () => void;
  onImport: (sheet: ParsedSheet, raw: string) => void;
}) {
  const [text, setText] = useState("");
  const sheet = useMemo<ParsedSheet | null>(() => {
    if (!text.trim()) return null;
    try {
      const s = parsePastedTable(text);
      return s.headers.length ? s : null;
    } catch {
      return null;
    }
  }, [text]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-slate-900">Paste {title} table</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-2 text-[13px] text-slate-500">
            Copy the list view from Fundserv/Winfund or a spreadsheet and paste it below.
            Tab, comma, and HTML tables are detected automatically.
          </p>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Paste tabular data here…"
            className="w-full rounded-xl border border-[var(--hairline)] p-3 font-mono text-[12px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          />

          {sheet && (
            <div className="mt-4">
              <p className="mb-2 text-[12px] text-slate-500">
                Detected {sheet.headers.length} columns · {sheet.rows.length} rows
              </p>
              <div className="max-h-56 overflow-auto rounded-xl border border-[var(--hairline)]">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-slate-50 text-[10.5px] uppercase text-slate-500">
                    <tr>{sheet.headers.map((h) => <th key={h} className="px-2.5 py-1.5 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hairline)]">
                    {sheet.rows.slice(0, 8).map((r) => (
                      <tr key={r.rowNumber}>
                        {sheet.headers.map((h) => (
                          <td key={h} className="px-2.5 py-1.5 text-slate-700">{String(r.cells[h] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--hairline)] px-5 py-3.5">
          <button onClick={onClose} className="h-9 rounded-lg border border-[var(--hairline)] px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            disabled={!sheet}
            onClick={() => sheet && onImport(sheet, text)}
            className="h-9 rounded-lg bg-brand px-4 text-[13px] font-medium text-white hover:bg-brand-hover disabled:opacity-40"
          >
            Import table
          </button>
        </footer>
      </div>
    </div>
  );
}
