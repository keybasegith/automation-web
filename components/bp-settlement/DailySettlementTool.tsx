"use client";

import { useCallback, useMemo, useState } from "react";
import { Search, AlertTriangle, Play, Loader2 } from "lucide-react";
import { DOCUMENT_SLOTS, MAX_FILE_MB } from "@/lib/bp-settlement/constants";
import { validateFile } from "@/lib/bp-settlement/validation";
import { parseUploadedFile, type ParsedUpload } from "@/lib/bp-settlement/parse-client";
import { analyze, isMismatch, type ReconcileInput } from "@/lib/bp-settlement/reconciliation";
import type {
  SettlementFileType,
  NormalizedTransaction,
  AnalysisResult,
  MatchRow,
  SideComparison,
} from "@/lib/bp-settlement/types";
import { UploadCard, type UploadedFileState } from "./UploadCard";
import { TransactionDrawer } from "./TransactionDrawer";
import { OverallStatusBadge, MatchStatusBadge, money } from "./ui";

interface FileEntry {
  id: string;
  slotType: SettlementFileType;
  file: File;
  display: UploadedFileState;
  parsed?: ParsedUpload;
}

interface Analysis {
  result: AnalysisResult;
  fundservById: Map<string, NormalizedTransaction>;
  winfundById: Map<string, NormalizedTransaction>;
}

type MismatchFilter =
  | "ALL" | "BUY" | "SELL" | "MISSING" | "EXTRA" | "AMOUNT" | "DATE" | "DUPLICATE" | "STATUS" | "REVIEW";

let seq = 0;
const nextId = () => `f_${Date.now()}_${seq++}`;

export default function DailySettlementTool() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState<MismatchFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [showMatched, setShowMatched] = useState(false);

  const anyParsing = files.some((f) => f.display.status === "validating" || f.display.status === "parsing");
  const hasAnyParsed = files.some((f) => f.display.status === "parsed");

  // Parse each newly added file locally; clear any prior analysis (recompute).
  const addFiles = useCallback(async (slotType: SettlementFileType, list: FileList) => {
    const slot = DOCUMENT_SLOTS.find((s) => s.fileType === slotType)!;
    setAnalysis(null);
    const seeded: FileEntry[] = Array.from(list).map((file) => {
      const v = validateFile({ name: file.name, size: file.size, mimeType: file.type });
      return {
        id: nextId(),
        slotType,
        file,
        display: {
          id: nextId(),
          name: file.name,
          size: file.size,
          status: v.ok ? "parsing" : "error",
          validationError: v.ok ? undefined : v.error,
          warnings: [],
          parsingErrors: [],
        },
      };
    });
    setFiles((prev) => [...(slot.allowMultiple ? prev : prev.filter((f) => f.slotType !== slotType)), ...seeded]);

    for (const entry of seeded) {
      if (entry.display.status === "error") continue;
      try {
        const parsed = await parseUploadedFile(entry.file, entry.id, slotType);
        setFiles((prev) => prev.map((f) => (f.id === entry.id ? applyParsed(f, parsed) : f)));
      } catch (err) {
        setFiles((prev) => prev.map((f) => (f.id === entry.id
          ? { ...f, display: { ...f.display, status: "error", parsingErrors: [String(err)] } } : f)));
      }
    }
  }, []);

  const reassign = useCallback(async (fileId: string, type: SettlementFileType) => {
    setAnalysis(null);
    const entry = files.find((f) => f.id === fileId);
    if (!entry) return;
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, slotType: type, display: { ...f.display, status: "parsing" } } : f)));
    try {
      const parsed = await parseUploadedFile(entry.file, entry.id, type);
      setFiles((prev) => prev.map((f) => (f.id === fileId ? applyParsed({ ...f, slotType: type }, parsed) : f)));
    } catch (err) {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, display: { ...f.display, status: "error", parsingErrors: [String(err)] } } : f)));
    }
  }, [files]);

  const removeFile = useCallback((displayId: string) => {
    setAnalysis(null);
    setFiles((prev) => prev.filter((f) => f.display.id !== displayId));
  }, []);

  const runAnalysis = useCallback(() => {
    setAnalyzing(true);
    // Gather each source independently from the uploaded files.
    const categoryFile = files.find((f) => f.slotType === "FUNDSERV_CATEGORY_SUMMARY" && f.parsed);
    const detailFiles = files.filter((f) => f.slotType === "FUNDSERV_DETAIL" && f.parsed);
    const winfundFile = files.find((f) => f.slotType === "WINFUND_UNSETTLED" && f.parsed);

    const fundservDetail = detailFiles.flatMap((f) => f.parsed!.transactions);
    const winfund = winfundFile?.parsed?.transactions ?? [];
    const usdExcludedCount = files.reduce((s, f) => s + (f.parsed?.usdExcludedCount ?? 0), 0);
    const warnings = files.flatMap((f) => f.parsed?.warnings ?? []).filter((w) => /usd/i.test(w));

    const input: ReconcileInput = {
      category: categoryFile?.parsed?.category ?? null,
      fundservDetail,
      winfund,
      detailAvailable: detailFiles.some((f) => f.parsed!.transactions.length > 0),
      winfundAvailable: !!winfundFile && (winfundFile.parsed?.transactions.length ?? 0) > 0,
      usdExcludedCount,
      warnings,
    };

    const result = analyze(input);
    setAnalysis({
      result,
      fundservById: new Map(fundservDetail.map((t) => [t.id, t])),
      winfundById: new Map(winfund.map((t) => [t.id, t])),
    });
    setAnalyzing(false);
  }, [files]);

  const result = analysis?.result ?? null;
  const selectedMatch = result?.matches.find((m) => m.id === selectedMatchId) ?? null;

  const mismatchRows = useMemo(() => {
    if (!result) return [];
    const q = search.trim().toLowerCase();
    return result.matches.filter((m) => {
      if (!isMismatch(m.status)) return false;
      if (filter === "BUY" && m.side !== "BUY") return false;
      if (filter === "SELL" && m.side !== "SELL") return false;
      if (filter === "MISSING" && m.status !== "MISSING_IN_WINFUND") return false;
      if (filter === "EXTRA" && m.status !== "EXTRA_IN_WINFUND") return false;
      if (filter === "AMOUNT" && m.status !== "AMOUNT_MISMATCH") return false;
      if (filter === "DATE" && m.status !== "WRONG_SETTLEMENT_DATE") return false;
      if (filter === "DUPLICATE" && m.status !== "DUPLICATE_IN_WINFUND" && m.status !== "DUPLICATE_IN_FUNDSERV") return false;
      if (filter === "STATUS" && m.status !== "WRONG_STATUS") return false;
      if (filter === "REVIEW" && m.status !== "MANUAL_REVIEW" && m.status !== "LOW_EXTRACTION_CONFIDENCE") return false;
      if (q && analysis) {
        const t = m.fundservTransactionId ? analysis.fundservById.get(m.fundservTransactionId) : analysis.winfundById.get(m.winfundTransactionIds[0]);
        const hay = [t?.supplierCode, t?.fundCode, t?.planId, t?.workOrderNumber].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [result, filter, search, analysis]);

  const matchedRows = useMemo(() => result?.matches.filter((m) => m.status === "EXACT_MATCH") ?? [], [result]);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. File upload */}
      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-slate-800">
          File upload <span className="text-[12px] font-normal text-slate-400">· PDF, XLSX, XLS · max {MAX_FILE_MB} MB</span>
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {DOCUMENT_SLOTS.map((slot) => (
            <UploadCard
              key={slot.fileType}
              slot={slot}
              files={files.filter((f) => f.slotType === slot.fileType).map((f) => f.display)}
              onAddFiles={(fl) => addFiles(slot.fileType, fl)}
              onRemove={removeFile}
              onReassign={(displayId, type) => {
                const entry = files.find((f) => f.display.id === displayId);
                if (entry) reassign(entry.id, type);
              }}
            />
          ))}
        </div>
        <div className="mt-4">
          <button
            onClick={runAnalysis}
            disabled={!hasAnyParsed || anyParsing || analyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-40"
          >
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Analyze Files
          </button>
          {anyParsing && <span className="ml-3 text-[12px] text-slate-400">Parsing files…</span>}
        </div>
      </section>

      {result && (
        <>
          {/* Overall status */}
          <section className="rounded-xl border border-[var(--hairline)] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <OverallStatusBadge status={result.overallStatus} />
                {result.settlementDate && <span className="text-[13px] text-slate-500">Settlement date: <span className="font-medium text-slate-700">{result.settlementDate}</span></span>}
              </div>
            </div>
            <p className="mt-3 text-[14px] text-slate-700">{result.overallExplanation}</p>
            {result.blockingErrors.map((e, i) => (
              <p key={i} className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                <AlertTriangle className="h-4 w-4" /> {e}
              </p>
            ))}
            {result.usdExcludedCount > 0 && (
              <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                <AlertTriangle className="h-4 w-4" /> {result.usdExcludedCount} USD transaction(s) were detected and excluded.
              </p>
            )}
          </section>

          {/* Buy + Sell comparison */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SideCard side={result.buy} />
            <SideCard side={result.sell} />
          </div>

          {/* Mismatch table */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-slate-800">Mismatch details</h2>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Supplier, fund, plan, work order"
                  className="w-64 rounded-lg border border-[var(--hairline-strong)] py-1.5 pl-8 pr-2 text-[12px] outline-none focus:border-brand" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["ALL", "All"], ["BUY", "Buy"], ["SELL", "Sell"], ["MISSING", "Missing"], ["EXTRA", "Extra"],
                ["AMOUNT", "Amount Mismatch"], ["DATE", "Date Mismatch"], ["DUPLICATE", "Duplicate"],
                ["STATUS", "Wrong Status"], ["REVIEW", "Manual Review"],
              ] as [MismatchFilter, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${filter === key ? "bg-brand text-white" : "bg-white text-slate-500 ring-1 ring-inset ring-[var(--hairline-strong)] hover:bg-slate-50"}`}>
                  {label}
                </button>
              ))}
            </div>
            <MismatchTable rows={mismatchRows} analysis={analysis!} onSelect={setSelectedMatchId} />
          </section>

          {/* Matched transactions (collapsed) */}
          <section>
            <button onClick={() => setShowMatched((v) => !v)} className="text-[13px] font-medium text-brand hover:underline">
              {showMatched ? "Hide" : "Show"} Matched Transactions ({matchedRows.length})
            </button>
            {showMatched && <div className="mt-3"><MismatchTable rows={matchedRows} analysis={analysis!} onSelect={setSelectedMatchId} /></div>}
          </section>
        </>
      )}

      {selectedMatch && analysis && (
        <TransactionDrawer
          match={selectedMatch}
          fundserv={selectedMatch.fundservTransactionId ? analysis.fundservById.get(selectedMatch.fundservTransactionId) : undefined}
          winfund={selectedMatch.winfundTransactionIds.map((id) => analysis.winfundById.get(id)!).filter(Boolean)}
          onClose={() => setSelectedMatchId(null)}
        />
      )}
    </div>
  );
}

function applyParsed(f: FileEntry, parsed: ParsedUpload): FileEntry {
  return {
    ...f,
    parsed,
    display: {
      ...f.display,
      status: parsed.extractionStatus === "error" ? "error" : parsed.extractionStatus === "manual_review" ? "manual" : "parsed",
      detectedType: parsed.fileType,
      classificationConfidence: parsed.classificationConfidence,
      rowOrPageCount: parsed.pageOrRowCount,
      warnings: parsed.warnings,
      parsingErrors: parsed.parsingErrors,
    },
  };
}

function SideCard({ side }: { side: SideComparison }) {
  const label = side.side === "BUY" ? "Buy Shares" : "Sell of Shares";
  const matched = side.matched;
  return (
    <section className="rounded-xl border border-[var(--hairline)] bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[16px] font-semibold text-slate-900">{label}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${matched ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
          {matched ? "Matched" : "Mismatch Found"}
        </span>
      </div>
      <div className="mt-4 space-y-2.5 text-[12px]">
        <SourceLine label="Fundserv Summary" count={side.summaryCount} total={side.summaryTotalCents} source={side.summarySource?.fileName} sub={side.summarySource?.row as string} />
        <SourceLine label="Fundserv Details" count={side.detailAvailable ? side.detailCount : null} total={side.detailAvailable ? side.detailTotalCents : null} unavailable={!side.detailAvailable} />
        <SourceLine label="Winfund Not Settled" count={side.winfundAvailable ? side.winfundCount : null} total={side.winfundAvailable ? side.winfundTotalCents : null} unavailable={!side.winfundAvailable} />
        <div className="mt-1 flex items-center justify-between border-t border-[var(--hairline)] pt-2.5">
          <span className="text-slate-500">Difference</span>
          <span className={`tabular-nums font-semibold ${side.amountDifferenceCents === 0 && side.countDifference === 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {side.countDifference !== null ? `${side.countDifference > 0 ? "+" : ""}${side.countDifference} tx · ` : ""}
            {side.amountDifferenceCents !== null ? money(side.amountDifferenceCents) : "unavailable"}
          </span>
        </div>
        {side.mismatchCount > 0 && <div className="text-[11px] text-slate-400">{side.mismatchCount} transaction-level mismatch(es)</div>}
      </div>
      <p className="mt-3 border-t border-[var(--hairline)] pt-2 text-[10px] leading-snug text-slate-400">
        Fundserv Summary figures reflect <span className="font-medium text-slate-500">Net Matched trades only</span> ({side.side === "BUY" ? "Net Matched - Pay Only" : "Net Matched - Rec Only"}). Individual Matched, Net Matched Switch and other categories are excluded.
      </p>
    </section>
  );
}

function SourceLine({ label, count, total, source, sub, unavailable }: {
  label: string; count: number | null; total: number | null; source?: string; sub?: string; unavailable?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-slate-500">{label}</p>
        {source && <p className="text-[10px] text-slate-400" title={`${source}${sub ? ` · ${sub}` : ""}`}>Source: {source}{sub ? ` · ${sub}` : ""}</p>}
      </div>
      <div className="text-right tabular-nums">
        {unavailable ? (
          <span className="text-[11px] italic text-amber-600">Unable to extract</span>
        ) : (
          <>
            <p className="font-semibold text-slate-800">{money(total)}</p>
            <p className="text-[10px] text-slate-400">{count ?? "—"} transactions</p>
          </>
        )}
      </div>
    </div>
  );
}

function MismatchTable({ rows, analysis, onSelect }: { rows: MatchRow[]; analysis: Analysis; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--hairline)] bg-white">
      <table className="w-full min-w-[1100px] text-[12px]">
        <thead>
          <tr className="border-b border-[var(--hairline)] text-left text-[11px] uppercase tracking-wide text-slate-400">
            {["Status", "B/S", "Supplier", "Fund", "Plan ID", "Work Order", "Fundserv", "Winfund", "Diff", "FS Date", "WF Date", "WF Status", "Reason"].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const f = m.fundservTransactionId ? analysis.fundservById.get(m.fundservTransactionId) : undefined;
            const w = analysis.winfundById.get(m.winfundTransactionIds[0]);
            const t = f ?? w;
            return (
              <tr key={m.id} className="cursor-pointer border-b border-[var(--hairline)] last:border-0 hover:bg-slate-50/70" onClick={() => onSelect(m.id)}>
                <td className="px-3 py-2"><MatchStatusBadge status={m.status} /></td>
                <td className="px-3 py-2 text-slate-600">{m.side}</td>
                <td className="px-3 py-2 text-slate-600">{t?.supplierCode ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{t?.fundCode ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{t?.planId ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{t?.workOrderNumber ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{m.fundservAmountCents !== null ? money(m.fundservAmountCents) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{m.winfundAmountCents !== null ? money(m.winfundAmountCents) : "—"}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${m.amountDifferenceCents ? "text-rose-600" : "text-slate-400"}`}>{m.amountDifferenceCents !== null ? money(m.amountDifferenceCents) : "—"}</td>
                <td className="px-3 py-2 text-slate-600">{f?.settlementDate ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{w?.settlementDate ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{w?.settlementStatus ?? "—"}</td>
                <td className="px-3 py-2 text-slate-500">{m.reason}</td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={13} className="px-3 py-8 text-center text-slate-400">No transactions match this filter.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
