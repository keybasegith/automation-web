"use client";

import { useMemo, useState } from "react";
import type { AccountSummary } from "@/lib/finance-intelligence/types";

interface Props {
  accounts: AccountSummary[];
  detectedFiscalYears: number[];
  fiscalYear: number;
  fiscalPeriod: string;
  asAtDate: string;
  selectedAccountNumber: string | null;
  onChange: (next: {
    accountNumber: string | null;
    fiscalYear: number;
    fiscalPeriod: string;
    asAtDate: string;
  }) => void;
  onPreview: () => void;
  isLoadingPreview: boolean;
}

const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

export default function AccountSelectionStep({
  accounts,
  detectedFiscalYears,
  fiscalYear,
  fiscalPeriod,
  asAtDate,
  selectedAccountNumber,
  onChange,
  onPreview,
  isLoadingPreview,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return accounts;
    return accounts.filter(
      (a) =>
        a.accountNumber.toLowerCase().includes(term) ||
        a.accountNumberRaw.toLowerCase().includes(term) ||
        a.accountName.toLowerCase().includes(term)
    );
  }, [accounts, search]);

  const fiscalYearOptions =
    detectedFiscalYears.length > 0
      ? detectedFiscalYears
      : [new Date().getFullYear()];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">
          Step 2 — Select Account & Period
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Pick the account, fiscal year, period, and as-at date to drive the
          analysis.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-700">Fiscal Year</span>
          <select
            value={fiscalYear}
            onChange={(e) =>
              onChange({
                accountNumber: selectedAccountNumber,
                fiscalYear: Number(e.target.value),
                fiscalPeriod,
                asAtDate,
              })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {fiscalYearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-700">Fiscal Period</span>
          <select
            value={fiscalPeriod}
            onChange={(e) =>
              onChange({
                accountNumber: selectedAccountNumber,
                fiscalYear,
                fiscalPeriod: e.target.value,
                asAtDate,
              })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.value} — {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-700">As at Date</span>
          <input
            type="date"
            value={asAtDate}
            onChange={(e) =>
              onChange({
                accountNumber: selectedAccountNumber,
                fiscalYear,
                fiscalPeriod,
                asAtDate: e.target.value,
              })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-700">
            Search Accounts
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by number or name…"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-700">
            Account ({filtered.length} of {accounts.length})
          </span>
          <select
            value={selectedAccountNumber ?? ""}
            onChange={(e) =>
              onChange({
                accountNumber: e.target.value || null,
                fiscalYear,
                fiscalPeriod,
                asAtDate,
              })
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            <option value="">Select an account…</option>
            {filtered.map((a) => (
              <option key={a.accountNumber} value={a.accountNumber}>
                {a.accountNumberRaw} — {a.accountName} ({a.transactionCount} tx)
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onPreview}
          disabled={!selectedAccountNumber || isLoadingPreview}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {isLoadingPreview ? "Loading preview…" : "Load Preview"}
        </button>
      </div>
    </section>
  );
}
