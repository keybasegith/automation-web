"use client";

import { formatAmount } from "@/lib/finance-intelligence/parseAmounts";
import type { AccountPreview } from "@/lib/finance-intelligence/types";

interface Props {
  preview: AccountPreview;
}

function formatCell(value: number | undefined): string {
  if (value === undefined) return "";
  return formatAmount(value);
}

export default function AccountPreviewTable({ preview }: Props) {
  const { account, rows, warnings } = preview;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Step 3 — Preview Transactions
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {account.accountNumberRaw} — {account.accountName} ·{" "}
            {rows.length} transaction{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Showing the parsed activity for this account.
        </p>
      </header>

      {warnings.length > 0 && (
        <ul className="mb-4 space-y-2">
          {warnings.map((w, i) => (
            <li
              key={i}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800"
            >
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-left font-semibold">Source</th>
              <th className="px-3 py-2 text-left font-semibold">Description / Reference</th>
              <th className="px-3 py-2 text-left font-semibold">Batch-Entry</th>
              <th className="px-3 py-2 text-right font-semibold">Debit</th>
              <th className="px-3 py-2 text-right font-semibold">Credit</th>
              <th className="px-3 py-2 text-right font-semibold">Net Change</th>
              <th className="px-3 py-2 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-xs text-slate-400"
                >
                  No transactions detected for this account.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.rowIndex} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {row.date ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {row.source ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-900">
                    <div className="font-medium">{row.description ?? "—"}</div>
                    {row.reference && row.reference !== row.description && (
                      <div className="text-xs text-slate-500">{row.reference}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {row.batchEntry ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900">
                    {formatCell(row.debit)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900">
                    {formatCell(row.credit)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-900">
                    {formatCell(row.netChange)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums font-medium text-slate-900">
                    {formatCell(row.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
