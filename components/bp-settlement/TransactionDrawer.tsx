"use client";

import { X } from "lucide-react";
import type { MatchRow, NormalizedTransaction } from "@/lib/bp-settlement/types";
import { MatchStatusBadge, money } from "./ui";

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-[12px]">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium tabular-nums text-slate-700">{value ?? "unavailable"}</span>
    </div>
  );
}

function RecordCard({ title, tx }: { title: string; tx: NormalizedTransaction | undefined }) {
  return (
    <div className="rounded-lg border border-[var(--hairline)] bg-white p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {tx ? (
        <div className="divide-y divide-[var(--hairline)]">
          <Field label="Supplier" value={tx.supplierCode} />
          <Field label="Fund" value={tx.fundCode} />
          <Field label="Plan ID" value={tx.planId} />
          <Field label="Work Order" value={tx.workOrderNumber} />
          <Field label="Contract" value={tx.contractNumber} />
          <Field label="Type" value={tx.transactionType.replace(/_/g, " ")} />
          <Field label="Amount" value={money(tx.normalizedAmountCents)} />
          <Field label="Settlement Date" value={tx.settlementDate} />
          <Field label="Settlement Status" value={tx.settlementStatus ?? tx.transactionStatus} />
          <Field label="Source file" value={tx.sourceFileName} />
          <Field label="Location" value={tx.sourceSheet ? `Sheet ${tx.sourceSheet}, row ${tx.sourceRow}` : `Row ${tx.sourceRow}`} />
          <Field label="Extraction" value={`${Math.round(tx.extractionConfidence * 100)}%`} />
        </div>
      ) : (
        <p className="text-[12px] italic text-slate-400">No record on this side.</p>
      )}
    </div>
  );
}

export function TransactionDrawer({
  match,
  fundserv,
  winfund,
  onClose,
}: {
  match: MatchRow;
  fundserv: NormalizedTransaction | undefined;
  winfund: NormalizedTransaction[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/20" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-[var(--background)] shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--hairline)] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <MatchStatusBadge status={match.status} />
            <span className="text-[12px] text-slate-400">{match.side}</span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-lg border border-[var(--hairline)] bg-white p-3">
            <p className="text-[13px] font-medium text-slate-700">{match.reason}</p>
            {match.amountDifferenceCents !== null && match.amountDifferenceCents !== 0 && (
              <p className="mt-1.5 text-[12px] text-slate-500">Amount difference: {money(match.amountDifferenceCents)}</p>
            )}
            {match.dateDifferenceDays !== null && match.dateDifferenceDays > 0 && (
              <p className="mt-0.5 text-[12px] text-slate-500">Date difference: {match.dateDifferenceDays} day(s)</p>
            )}
          </div>

          {/* The two uploaded records are kept separate — never merged. */}
          <RecordCard title="Fundserv Uploaded Record" tx={fundserv} />
          {winfund.length <= 1 ? (
            <RecordCard title="Winfund Uploaded Record" tx={winfund[0]} />
          ) : (
            <div className="space-y-2">
              {winfund.map((w, i) => <RecordCard key={w.id} title={`Winfund Uploaded Record ${i + 1}`} tx={w} />)}
            </div>
          )}

          {match.comparedFields.length > 0 && (
            <div className="rounded-lg border border-[var(--hairline)] bg-white p-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Field comparison</p>
              <div className="divide-y divide-[var(--hairline)]">
                {match.comparedFields.map((c) => (
                  <div key={c.field} className="flex items-center justify-between gap-2 py-1 text-[12px]">
                    <span className="text-slate-500">{c.field}</span>
                    <span className={`tabular-nums ${c.equal ? "text-emerald-600" : "text-rose-600"}`}>
                      {c.fundservValue ?? "—"} {c.equal ? "=" : "≠"} {c.winfundValue ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
