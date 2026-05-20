"use client";

import { useMemo, useState } from "react";
import type { AccountSummary } from "@/lib/finance-intelligence/types";

interface Props {
  accounts: AccountSummary[];
  selected: Set<string>;
  onToggle: (accountNumber: string) => void;
  onSelectAllFiltered: (filteredAccountNumbers: string[]) => void;
  onClear: () => void;
  onDownload: () => void;
  isDownloading: boolean;
  summary: string | null;
  error: string | null;
}

export default function SelectedAccountsDownloadSection({
  accounts,
  selected,
  onToggle,
  onSelectAllFiltered,
  onClear,
  onDownload,
  isDownloading,
  summary,
  error,
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

  const filteredNumbers = useMemo(
    () => filtered.map((a) => a.accountNumber),
    [filtered]
  );
  const allFilteredSelected =
    filtered.length > 0 && filteredNumbers.every((n) => selected.has(n));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Download Selected Accounts
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Pick a subset of accounts to bundle into one Excel workbook, one
            tab per selected account, all using the fiscal year, period, and
            as-at date selected below.
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          disabled={isDownloading || selected.size === 0}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {isDownloading
            ? "Generating…"
            : `Generate & Download Selected (${selected.size} tab${selected.size === 1 ? "" : "s"})`}
        </button>
      </header>

      <div className="mt-2 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by number or name…"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectAllFiltered(filteredNumbers)}
            disabled={filtered.length === 0 || allFilteredSelected}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {search.trim()
              ? `Select All Filtered (${filtered.length})`
              : `Select All (${accounts.length})`}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={selected.size === 0}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-brand hover:text-brand disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing {filtered.length} of {accounts.length}
        </span>
        <span className="font-medium text-slate-700">
          {selected.size} selected
        </span>
      </div>

      <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-slate-200">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500">
            No accounts match this search.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((a) => {
              const isChecked = selected.has(a.accountNumber);
              return (
                <li key={a.accountNumber}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggle(a.accountNumber)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-mono text-slate-900">
                        {a.accountNumberRaw}
                      </span>{" "}
                      — <span className="text-slate-700">{a.accountName}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {a.transactionCount} tx
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {summary && (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
          {summary}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </section>
  );
}
