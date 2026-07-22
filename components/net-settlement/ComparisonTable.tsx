"use client";

import { useMemo, useState } from "react";
import { X, Download, Search } from "lucide-react";
import type { FundservRecord, WinfundRecord, MatchResult, ExceptionSeverity } from "@/lib/net-settlement/types";
import { categoryOf, SEVERITY_BY_STATUS, type MatchCategory } from "@/lib/net-settlement/summary";
import { recommendForMatch } from "@/lib/net-settlement/recommendation";
import { MatchStatusBadge, SeverityBadge, formatMoney } from "@/components/net-settlement/ui";

type TabKey = "all" | "exact" | "discrepancy" | "fundserv_only" | "winfund_only" | "possible" | "adjustments";
const TABS: [TabKey, string][] = [
  ["all", "All"],
  ["exact", "Matches"],
  ["discrepancy", "Discrepancies"],
  ["fundserv_only", "Fundserv Only"],
  ["winfund_only", "Winfund Only"],
  ["possible", "Possible Matches"],
  ["adjustments", "Required Adjustments"],
];

function priorityFor(status: MatchResult["status"], cat: MatchCategory): ExceptionSeverity {
  if (cat === "exact") return "low";
  return SEVERITY_BY_STATUS[status] ?? "medium";
}

interface Row {
  m: MatchResult;
  cat: MatchCategory;
  plan: string;
  fund: string;
  type: string;
  fAmt: number | null;
  wAmt: number | null;
  diff: number;
  fDate: string;
  wDate: string;
  ref: string;
  bank: string;
  settle: string;
  action: string;
  priority: ExceptionSeverity;
}

export default function ComparisonTable({
  fundserv,
  winfund,
  matches,
}: {
  fundserv: FundservRecord[];
  winfund: WinfundRecord[];
  matches: MatchResult[];
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MatchResult | null>(null);

  const fm = useMemo(() => new Map(fundserv.map((r) => [r.id, r])), [fundserv]);
  const wm = useMemo(() => new Map(winfund.map((r) => [r.id, r])), [winfund]);

  const rows: Row[] = useMemo(
    () =>
      matches.map((m) => {
        const f = m.fundservIds.map((id) => fm.get(id)).filter(Boolean) as FundservRecord[];
        const w = m.winfundIds.map((id) => wm.get(id)).filter(Boolean) as WinfundRecord[];
        const cat = categoryOf(m.status);
        const rec = recommendForMatch(m, fundserv, winfund);
        return {
          m,
          cat,
          plan: f[0]?.dealerAccountId ?? w[0]?.planId ?? "—",
          fund: f[0]?.fundId ?? w[0]?.fundNumber ?? "—",
          type: f[0]?.transactionType ?? w[0]?.transactionType ?? "—",
          fAmt: f.length ? f.reduce((a, r) => a + (r.settlementAmountCents ?? 0), 0) : null,
          wAmt: w.length ? w.reduce((a, r) => a + (r.amountCents ?? 0), 0) : null,
          diff: m.amountDifferenceCents,
          fDate: f[0]?.settlementDate ?? f[0]?.tradeDate ?? "—",
          wDate: w[0]?.trustSettledDate ?? w[0]?.trustTransactionDate ?? "—",
          ref: f[0]?.rawReference ?? w[0]?.wireOrderNumber ?? "—",
          bank: w[0]?.bankCode ?? "—",
          settle: w[0]?.settlementStatus ?? "—",
          action: cat === "exact" ? "—" : rec.action,
          priority: priorityFor(m.status, cat),
        };
      }),
    [matches, fm, wm, fundserv, winfund]
  );

  const filtered = rows.filter((r) => {
    const tabOk =
      tab === "all" ? true : tab === "adjustments" ? r.cat !== "exact" : r.cat === tab;
    if (!tabOk) return false;
    if (!q.trim()) return true;
    const hay = `${r.plan} ${r.fund} ${r.ref} ${r.type} ${r.m.status}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  function exportView() {
    const cols = ["Status", "Priority", "Plan", "Fund", "Fundserv", "Winfund", "Difference", "Type", "Fundserv Date", "Winfund Date", "Reference", "Bank Code", "Settlement Status", "Suggested Action"];
    const lines = [cols.join(",")];
    for (const r of filtered) {
      const vals = [
        r.m.status, r.priority, r.plan, r.fund,
        r.fAmt === null ? "" : (r.fAmt / 100).toFixed(2),
        r.wAmt === null ? "" : (r.wAmt / 100).toFixed(2),
        (r.diff / 100).toFixed(2), r.type, r.fDate, r.wDate, r.ref, r.bank, r.settle, r.action,
      ];
      lines.push(vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "net-settlement-view.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map(([key, label]) => {
            const n = key === "all" ? rows.length : key === "adjustments" ? rows.filter((r) => r.cat !== "exact").length : rows.filter((r) => r.cat === key).length;
            return (
              <button key={key} onClick={() => setTab(key)}
                className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${tab === key ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {label} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plan, fund, reference…"
              className="h-8 w-56 rounded-lg border border-[var(--hairline)] pl-8 pr-2 text-[12px] outline-none focus:border-brand" />
          </div>
          <button onClick={exportView} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--hairline)] px-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
            <Download className="h-3.5 w-3.5" /> Export view
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--hairline)] bg-white">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 bg-slate-50 text-[10.5px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Plan</th>
              <th className="px-3 py-2 font-medium">Fund</th>
              <th className="px-3 py-2 text-right font-medium">Fundserv</th>
              <th className="px-3 py-2 text-right font-medium">Winfund</th>
              <th className="px-3 py-2 text-right font-medium">Diff</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Reference</th>
              <th className="px-3 py-2 font-medium">Bank</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hairline)]">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-400">No rows in this view.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.m.id} onClick={() => setSelected(r.m)} className="cursor-pointer hover:bg-slate-50/70">
                <td className="px-3 py-2"><MatchStatusBadge status={r.m.status} /></td>
                <td className="px-3 py-2"><SeverityBadge severity={r.priority} /></td>
                <td className="px-3 py-2 text-slate-700">{r.plan}</td>
                <td className="px-3 py-2 text-slate-700">{r.fund}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.fAmt === null ? "—" : formatMoney(r.fAmt)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.wAmt === null ? "—" : formatMoney(r.wAmt)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.diff !== 0 ? "text-rose-600" : "text-slate-400"}`}>{formatMoney(r.diff)}</td>
                <td className="px-3 py-2 text-slate-600">{r.type}</td>
                <td className="px-3 py-2 text-slate-500">{r.ref}</td>
                <td className="px-3 py-2 text-slate-500">{r.bank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <SidePanel match={selected} fundserv={fundserv} winfund={winfund} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function SidePanel({
  match, fundserv, winfund, onClose,
}: {
  match: MatchResult; fundserv: FundservRecord[]; winfund: WinfundRecord[]; onClose: () => void;
}) {
  const f = match.fundservIds.map((id) => fundserv.find((r) => r.id === id)).filter(Boolean) as FundservRecord[];
  const w = match.winfundIds.map((id) => winfund.find((r) => r.id === id)).filter(Boolean) as WinfundRecord[];
  const rec = recommendForMatch(match, fundserv, winfund);

  const fRows: [string, string][] = f.length ? [
    ["Order / Ref", f[0].rawReference ?? "—"],
    ["Fund", f[0].fundId ?? "—"],
    ["Account", f[0].dealerAccountId ?? "—"],
    ["Type", f[0].transactionType ?? "—"],
    ["Amount", f.map((r) => formatMoney(r.settlementAmountCents ?? 0)).join(", ")],
    ["Settlement date", f[0].settlementDate ?? "—"],
    ["Currency", f[0].currency ?? "—"],
    ["Dealer", f[0].dealerCode ?? "—"],
  ] : [];
  const wRows: [string, string][] = w.length ? [
    ["Wire order", w[0].wireOrderNumber ?? "—"],
    ["Fund", w[0].fundNumber ?? "—"],
    ["Plan", w[0].planId ?? "—"],
    ["Type", w[0].transactionType ?? "—"],
    ["Amount", w.map((r) => formatMoney(r.amountCents ?? 0)).join(", ")],
    ["Settled date", w[0].trustSettledDate ?? "—"],
    ["Bank code", w[0].bankCode ?? "—"],
    ["Client", w[0].clientName ?? "—"],
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3.5">
          <div className="flex items-center gap-2"><MatchStatusBadge status={match.status} /></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </header>
        <div className="p-5">
          <p className="text-[13px] text-slate-600">{match.explanation}</p>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-[var(--hairline)]">
            <p className="text-[13px]"><span className="font-semibold">Required action: </span>{rec.action}</p>
            {rec.adjustment && <p className="mt-1 text-[13px] text-brand"><span className="font-semibold">Required adjustment: </span>{rec.adjustment}</p>}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <RecordCol title="Fundserv" rows={fRows} />
            <RecordCol title="Winfund" rows={wRows} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordCol({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {rows.length === 0 ? (
        <p className="text-[12px] text-slate-400">No record</p>
      ) : (
        <dl className="space-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[10.5px] uppercase tracking-wide text-slate-400">{k}</dt>
              <dd className="text-[12.5px] text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
