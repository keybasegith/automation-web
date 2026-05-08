"use client";

import type { AuditLogEntry } from "@/lib/document-intake/types";
import { AUDIT_ACTION_LABEL } from "@/lib/document-intake/auditLog";

interface Props {
  entries: AuditLogEntry[];
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function AuditLogPanel({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">
          Audit Log (this session)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Local audit entries for this intake session. {/* TODO: persist to Supabase */}
          Future iteration will persist these to the central audit store.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-3 font-semibold">Timestamp</th>
              <th className="px-6 py-3 font-semibold">Employee</th>
              <th className="px-6 py-3 font-semibold">Action</th>
              <th className="px-6 py-3 font-semibold">Client</th>
              <th className="px-6 py-3 font-semibold">Source File</th>
              <th className="px-6 py-3 font-semibold">Details</th>
              <th className="px-6 py-3 font-semibold">Before / After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-6 py-3 text-xs text-slate-600">
                  {formatTime(e.timestamp)}
                </td>
                <td className="px-6 py-3 text-slate-700">
                  {e.employeeName || "—"}
                </td>
                <td className="px-6 py-3 text-slate-700">
                  {AUDIT_ACTION_LABEL[e.action]}
                </td>
                <td className="px-6 py-3 text-slate-700">{e.clientName || "—"}</td>
                <td className="px-6 py-3 font-mono text-xs text-slate-600">
                  {e.fileName || "—"}
                </td>
                <td className="px-6 py-3 text-xs text-slate-600">{e.details}</td>
                <td className="px-6 py-3 text-xs text-slate-600">
                  {e.previousValue !== undefined || e.newValue !== undefined ? (
                    <span className="font-mono text-[11px]">
                      <span className="text-slate-400">{e.previousValue ?? "—"}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="text-slate-700">{e.newValue ?? "—"}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
