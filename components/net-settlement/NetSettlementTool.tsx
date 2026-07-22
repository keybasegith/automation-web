"use client";

import { useCallback, useRef, useState } from "react";
import {
  UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2,
  ClipboardPaste, FileDown, FileText, Printer, Trash2, ShieldCheck,
} from "lucide-react";
import type { ParsedFile, ParsedSheet } from "@/lib/net-settlement/parse";
import { parseAnyFile } from "@/lib/net-settlement/parseFile";
import { detectSource } from "@/lib/net-settlement/detectSource";
import { reconcile, missingFundservFields, missingWinfundFields, type ReconcileResult } from "@/lib/net-settlement/reconcile";
import { categoryOf } from "@/lib/net-settlement/summary";
import { recommendForMatch } from "@/lib/net-settlement/recommendation";
import type { DetectedDetails } from "@/lib/net-settlement/types";
import type { ResolvedMapping } from "@/lib/net-settlement/normalize";
import { buildWorkbook, buildAdjustmentsCsv, buildPdfSummary } from "@/lib/net-settlement/clientExport";
import { SummaryCard, SeverityBadge, MatchStatusBadge, formatMoney } from "@/components/net-settlement/ui";
import ComparisonTable from "@/components/net-settlement/ComparisonTable";
import PasteTableModal from "@/components/net-settlement/PasteTableModal";
import ColumnMappingModal, { type FieldOption } from "@/components/net-settlement/ColumnMappingModal";
import FilePreview, { type PreviewSource } from "@/components/net-settlement/FilePreview";

type Source = "fundserv" | "winfund";

interface Slot {
  fileName: string;
  sizeBytes: number;
  kind: string;
  sheetNames: string[];
  sheet: ParsedSheet;
  detectedSource: "fundserv" | "winfund" | "unknown";
  confidence: string;
  warnings: string[];
}

const STEPS = [
  "Reading Fundserv file",
  "Reading Winfund file",
  "Detecting columns",
  "Normalizing transactions",
  "Matching records",
  "Calculating discrepancies",
  "Preparing adjustment summary",
];

const FUNDSERV_FIELDS: FieldOption[] = [
  { value: "settlementAmount", label: "Settlement Amt", required: true },
  { value: "fundId", label: "Fund ID", required: true },
  { value: "dealerAccountId", label: "Dealer Account ID", required: true },
  { value: "orderId", label: "Order ID" },
  { value: "sourceIdentifier", label: "Source Identifier" },
  { value: "tradeDate", label: "Trade Date" },
  { value: "settlementDate", label: "Settlement Date" },
  { value: "transactionType", label: "Tx Type" },
  { value: "currency", label: "Currency" },
  { value: "dealerCode", label: "Dealer" },
  { value: "contractNumber", label: "Contract Number" },
];
const WINFUND_FIELDS: FieldOption[] = [
  { value: "amount", label: "Amount", required: true },
  { value: "fundNumber", label: "Fund #", required: true },
  { value: "planId", label: "Plan ID", required: true },
  { value: "wireOrderNumber", label: "Wire Order #" },
  { value: "trustSettledDate", label: "Trust Settled Date" },
  { value: "trustTransactionDate", label: "Trust Transaction Date" },
  { value: "transactionType", label: "Transaction Type" },
  { value: "transactionStatus", label: "Transaction Status" },
  { value: "settlementStatus", label: "Settlement Status" },
  { value: "bankCode", label: "Bank Code" },
  { value: "clientName", label: "Client Name" },
  { value: "supplier", label: "Supplier" },
  { value: "repCode", label: "Rep Code" },
  { value: "planType", label: "Plan Type" },
  { value: "userId", label: "UserID" },
  { value: "dealerCode", label: "Dealer" },
  { value: "currency", label: "Currency" },
];

const fmtBytes = (b: number) => (b < 1024 ? `${b} B` : b < 1e6 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1e6).toFixed(1)} MB`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function bestSheet(pf: ParsedFile, fileName: string): { sheet: ParsedSheet | null; source: "fundserv" | "winfund" | "unknown"; confidence: string } {
  if (pf.sheets.length === 0) return { sheet: null, source: "unknown", confidence: "low" };
  const scored = pf.sheets.map((s) => ({ s, d: detectSource(s.headers, fileName) }));
  scored.sort((a, b) => Math.max(b.d.fundservScore, b.d.winfundScore) - Math.max(a.d.fundservScore, a.d.winfundScore));
  const top = scored[0];
  // detectSource can return other SourceType values; this tool only routes to
  // the two settlement sides.
  const source =
    top.d.source === "fundserv" || top.d.source === "winfund" ? top.d.source : "unknown";
  return { sheet: top.s, source, confidence: top.d.confidence };
}

export default function NetSettlementTool() {
  const [fSlot, setFSlot] = useState<Slot | null>(null);
  const [wSlot, setWSlot] = useState<Slot | null>(null);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [phase, setPhase] = useState<number>(-1); // -1 idle; 0..STEPS.length running/done
  const [error, setError] = useState<string | null>(null);
  const [pasteFor, setPasteFor] = useState<Source | null>(null);
  const [mapFor, setMapFor] = useState<Source | null>(null);
  const [pageDrag, setPageDrag] = useState(false);
  const [detailsOverride, setDetailsOverride] = useState<Partial<DetectedDetails>>({});

  const fOverride = useRef<ResolvedMapping | undefined>(undefined);
  const wOverride = useRef<ResolvedMapping | undefined>(undefined);
  // Keep latest slots for async compute.
  const slotsRef = useRef<{ f: Slot | null; w: Slot | null }>({ f: null, w: null });

  const compute = useCallback(async () => {
    const f = slotsRef.current.f;
    const w = slotsRef.current.w;
    if (!f || !w) return;
    setError(null);
    setResult(null);
    for (let i = 0; i < STEPS.length; i++) {
      setPhase(i);
      await sleep(90);
    }
    try {
      const res = reconcile(f.sheet, w.sheet, {
        fundservMapping: fOverride.current,
        winfundMapping: wOverride.current,
      });
      const missF = missingFundservFields(res.fundservMapping);
      const missW = missingWinfundFields(res.winfundMapping);
      if (missF.length && !fOverride.current) { setPhase(-1); setMapFor("fundserv"); return; }
      if (missW.length && !wOverride.current) { setPhase(-1); setMapFor("winfund"); return; }
      setResult(res);
      setDetailsOverride({});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase(STEPS.length); // done
    }
  }, []);

  const setSlot = useCallback((source: Source, slot: Slot | null) => {
    if (source === "fundserv") { slotsRef.current.f = slot; setFSlot(slot); fOverride.current = undefined; }
    else { slotsRef.current.w = slot; setWSlot(slot); wOverride.current = undefined; }
    if (slotsRef.current.f && slotsRef.current.w) compute();
  }, [compute]);

  const ingestFile = useCallback(async (file: File, forced?: Source) => {
    try {
      const buf = await file.arrayBuffer();
      const pf = await parseAnyFile(buf, file.name);
      const { sheet, source, confidence } = bestSheet(pf, file.name);
      if (!sheet) {
        setError(`${file.name}: ${pf.warnings[0] ?? "No table found."}`);
        return;
      }
      const slot: Slot = {
        fileName: file.name, sizeBytes: file.size, kind: pf.kind,
        sheetNames: pf.sheets.map((s) => s.name), sheet,
        detectedSource: source, confidence, warnings: pf.warnings,
      };
      const target: Source = forced ?? (source === "winfund" ? "winfund" : "fundserv");
      setSlot(target, slot);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [setSlot]);

  // Page-level drop: route each file to the correct zone by detection.
  const onPageDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setPageDrag(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      const buf = await file.arrayBuffer();
      const pf = await parseAnyFile(buf, file.name);
      const { source } = bestSheet(pf, file.name);
      await ingestFile(file, source === "winfund" ? "winfund" : source === "fundserv" ? "fundserv" : undefined);
    }
  }, [ingestFile]);

  function importPaste(source: Source, sheet: ParsedSheet) {
    const det = detectSource(sheet.headers);
    const detected =
      det.source === "fundserv" || det.source === "winfund" ? det.source : "unknown";
    setSlot(source, {
      fileName: `Pasted ${source} table`, sizeBytes: 0, kind: "pasted",
      sheetNames: ["pasted"], sheet, detectedSource: detected, confidence: det.confidence, warnings: [],
    });
    setPasteFor(null);
  }

  function applyMapping(source: Source, mapping: ResolvedMapping) {
    if (source === "fundserv") fOverride.current = mapping;
    else wOverride.current = mapping;
    setMapFor(null);
    compute();
  }

  function clearAll() {
    if (!confirm("Clear the files and results and start again?")) return;
    slotsRef.current = { f: null, w: null };
    fOverride.current = undefined; wOverride.current = undefined;
    setFSlot(null); setWSlot(null); setResult(null); setPhase(-1);
    setError(null); setDetailsOverride({});
  }

  const details: DetectedDetails | null = result
    ? { ...result.detected, ...detailsOverride }
    : null;

  function download(bytes: Uint8Array | string, name: string, mime: string) {
    const part: BlobPart =
      typeof bytes === "string"
        ? bytes
        : (bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    const blob = new Blob([part], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function doExport(kind: "xlsx" | "csv" | "pdf") {
    if (!result || !details) return;
    const meta = {
      fundservFileName: fSlot?.fileName ?? "fundserv",
      winfundFileName: wSlot?.fileName ?? "winfund",
      details,
      generatedAt: new Date().toISOString(),
    };
    const data = { fundserv: result.fundserv, winfund: result.winfund, matches: result.matches, summary: result.summary };
    const stamp = (details.settlementDate ?? "reconciliation").replace(/[^0-9a-zA-Z-]/g, "");
    if (kind === "xlsx") download(buildWorkbook(meta, data), `net-settlement-${stamp}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    else if (kind === "csv") download(buildAdjustmentsCsv(data), `required-adjustments-${stamp}.csv`, "text/csv");
    else download(await buildPdfSummary(meta, data), `net-settlement-${stamp}.pdf`, "application/pdf");
  }

  const running = phase >= 0 && phase < STEPS.length && !result;

  // Mappings only exist once reconcile has run; before that the preview just
  // shows the raw columns.
  const previewSources: PreviewSource[] = [
    fSlot && { id: "fundserv", label: "Fundserv", fileName: fSlot.fileName, kind: fSlot.kind, sheet: fSlot.sheet, mapping: fOverride.current ?? result?.fundservMapping, fields: FUNDSERV_FIELDS },
    wSlot && { id: "winfund", label: "Winfund", fileName: wSlot.fileName, kind: wSlot.kind, sheet: wSlot.sheet, mapping: wOverride.current ?? result?.winfundMapping, fields: WINFUND_FIELDS },
  ].filter(Boolean) as PreviewSource[];

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setPageDrag(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setPageDrag(false); }}
      onDrop={onPageDrop}
      className={`relative rounded-2xl ${pageDrag ? "outline outline-2 outline-dashed outline-brand/50" : ""}`}
    >
      {/* Drop zones */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Zone source="fundserv" title="Fundserv File" description="Drop the Fundserv N$M export here"
          slot={fSlot} onFile={(f) => ingestFile(f, "fundserv")} onPaste={() => setPasteFor("fundserv")}
          onRemove={() => setSlot("fundserv", null)} details={details} />
        <Zone source="winfund" title="Winfund File" description="Drop the Winfund trust transaction export here"
          slot={wSlot} onFile={(f) => ingestFile(f, "winfund")} onPaste={() => setPasteFor("winfund")}
          onRemove={() => setSlot("winfund", null)} details={details} />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" /> Files are processed in this browser session and are not saved.
      </p>

      {previewSources.length > 0 && <FilePreview sources={previewSources} />}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700 ring-1 ring-inset ring-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* Progress */}
      {running && (
        <div className="mt-6 rounded-2xl border border-[var(--hairline)] bg-white p-5">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin text-brand" /> Comparing transactions…
          </p>
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s} className={`flex items-center gap-2 text-[12.5px] ${i < phase ? "text-slate-500" : i === phase ? "text-slate-900" : "text-slate-300"}`}>
                {i < phase ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : i === phase ? <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-200" />}
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Results */}
      {result && details && (
        <div className="mt-8">
          <DetailsBar details={details} onChange={(patch) => setDetailsOverride((d) => ({ ...d, ...patch }))} />

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <SummaryCard label="Fundserv Records" value={result.summary.fundservCount} />
            <SummaryCard label="Winfund Records" value={result.summary.winfundCount} />
            <SummaryCard label="Exact Matches" value={result.summary.exactMatches + result.summary.aggregateMatches} tone="good" />
            <SummaryCard label="Possible Matches" value={result.summary.probableMatches} />
            <SummaryCard label="Discrepancies" value={result.summary.exceptions - result.summary.probableMatches} tone={result.summary.exceptions - result.summary.probableMatches > 0 ? "warn" : "default"} />
            <SummaryCard label="Fundserv Total" value={formatMoney(result.summary.fundservTotalCents)} />
            <SummaryCard label="Winfund Total" value={formatMoney(result.summary.winfundTotalCents)} />
            <SummaryCard label="Total Difference" value={formatMoney(result.summary.differenceCents)} tone={result.summary.differenceCents !== 0 ? "warn" : "good"} emphasis />
          </div>

          {/* Exports */}
          <div className="mt-5 flex flex-wrap gap-2">
            <ExportBtn icon={FileDown} label="Reconciliation Excel" onClick={() => doExport("xlsx")} />
            <ExportBtn icon={FileText} label="Required Adjustments" onClick={() => doExport("csv")} />
            <ExportBtn icon={FileDown} label="PDF Summary" onClick={() => doExport("pdf")} />
            <ExportBtn icon={Printer} label="Print" onClick={() => window.print()} />
            <button onClick={clearAll} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-[13px] font-medium text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" /> Clear files & start again
            </button>
          </div>

          <RequiredAdjustments result={result} />

          <section className="mt-8">
            <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Detailed comparison</h2>
            <ComparisonTable fundserv={result.fundserv} winfund={result.winfund} matches={result.matches} />
          </section>
        </div>
      )}

      {pasteFor && (
        <PasteTableModal
          title={pasteFor === "fundserv" ? "Fundserv" : "Winfund"}
          onClose={() => setPasteFor(null)}
          onImport={(sheet) => importPaste(pasteFor, sheet)}
        />
      )}
      {mapFor && (mapFor === "fundserv" ? fSlot : wSlot) && (
        <ColumnMappingModal
          title={mapFor === "fundserv" ? "Fundserv" : "Winfund"}
          sheet={(mapFor === "fundserv" ? fSlot! : wSlot!).sheet}
          mapping={
            reconcile((fSlot ?? wSlot)!.sheet, (wSlot ?? fSlot)!.sheet)[mapFor === "fundserv" ? "fundservMapping" : "winfundMapping"]
          }
          fields={mapFor === "fundserv" ? FUNDSERV_FIELDS : WINFUND_FIELDS}
          onClose={() => setMapFor(null)}
          onConfirm={(m) => applyMapping(mapFor, m)}
        />
      )}
    </div>
  );
}

/* ------------------------------- Zone -------------------------------- */
function Zone({
  source, title, description, slot, onFile, onPaste, onRemove, details,
}: {
  source: Source; title: string; description: string; slot: Slot | null;
  onFile: (f: File) => void; onPaste: () => void; onRemove: () => void; details: DetectedDetails | null;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accepted = source === "fundserv" ? "Fundserv" : "Winfund";

  if (slot) {
    const mismatch = slot.detectedSource !== "unknown" && slot.detectedSource !== source;
    return (
      <div className="rounded-2xl border border-[var(--hairline)] bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><FileSpreadsheet className="h-4 w-4" /></div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900">{title}</p>
            <p className="truncate text-[12px] text-slate-500">{slot.fileName}</p>
          </div>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ring-1 ring-inset ${mismatch ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>
            {slot.detectedSource === "unknown" ? "unclassified" : `detected: ${slot.detectedSource}`}
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
          <Info k="Rows" v={String(slot.sheet.rows.length)} />
          <Info k="Type" v={slot.kind.toUpperCase()} />
          {slot.sizeBytes > 0 && <Info k="Size" v={fmtBytes(slot.sizeBytes)} />}
          <Info k="Worksheet" v={slot.sheet.name} />
          <Info k="Columns" v={String(slot.sheet.headers.length)} />
          <Info k="Dealer" v={details?.dealer ?? "—"} />
          <Info k="Currency" v={details?.currency ?? "—"} />
          <Info k="Settlement date" v={details?.settlementDate ?? "—"} />
        </dl>

        {mismatch && (
          <p className="mt-2 flex items-start gap-1 text-[11px] text-amber-600">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> This looks like a {slot.detectedSource} file in the {accepted} slot. Move it if needed.
          </p>
        )}
        {slot.warnings.map((w, i) => (
          <p key={i} className="mt-1 flex items-start gap-1 text-[11px] text-amber-600"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {w}</p>
        ))}

        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"><CheckCircle2 className="h-3 w-3" /> Ready</span>
          <button onClick={() => inputRef.current?.click()} className="ml-auto text-[12px] font-medium text-brand hover:underline">Replace</button>
          <button onClick={onRemove} className="text-[12px] font-medium text-slate-500 hover:text-rose-600">Remove</button>
        </div>
        <input ref={inputRef} type="file" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]); }}
      className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${drag ? "border-brand bg-brand-soft/60" : "border-slate-300 bg-slate-50/60"}`}
    >
      <UploadCloud className={`h-8 w-8 ${drag ? "text-brand" : "text-slate-400"}`} />
      <p className="mt-2 text-[15px] font-semibold text-slate-800">{title}</p>
      <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>
      <p className="mt-1 text-[11px] text-slate-400">Excel, CSV, PDF, HTML, or pasted table</p>
      <div className="mt-4 flex gap-2">
        <button onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white hover:bg-brand-hover">
          <UploadCloud className="h-3.5 w-3.5" /> Browse File
        </button>
        <button onClick={onPaste} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--hairline)] px-3.5 text-[13px] font-medium text-slate-700 hover:bg-white">
          <ClipboardPaste className="h-3.5 w-3.5" /> Paste Table
        </button>
      </div>
      <input ref={inputRef} type="file" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-400">{k}</dt>
      <dd className="truncate text-right font-medium text-slate-700">{v}</dd>
    </div>
  );
}

/* --------------------------- Details bar ----------------------------- */
function DetailsBar({ details, onChange }: { details: DetectedDetails; onChange: (p: Partial<DetectedDetails>) => void }) {
  const field = (label: string, key: keyof DetectedDetails, placeholder = "—") => (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <input
        value={details[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange({ [key]: e.target.value || null } as Partial<DetectedDetails>)}
        className="h-8 rounded-lg border border-[var(--hairline)] px-2 text-[12.5px] text-slate-800 outline-none focus:border-brand"
      />
    </label>
  );
  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-white p-4">
      <p className="mb-2.5 text-[12px] font-semibold text-slate-700">Detected settlement details <span className="font-normal text-slate-400">— correct if needed</span></p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {field("Settlement Date", "settlementDate", "YYYY-MM-DD")}
        {field("Dealer", "dealer")}
        {field("Currency", "currency")}
        {field("Cycle", "cycle", "T+1")}
        {field("Category", "category")}
      </div>
    </div>
  );
}

/* ----------------------- Required adjustments ------------------------ */
function RequiredAdjustments({ result }: { result: ReconcileResult }) {
  const items = result.matches
    .filter((m) => categoryOf(m.status) !== "exact")
    .map((m) => ({ m, rec: recommendForMatch(m, result.fundserv, result.winfund) }));

  if (items.length === 0)
    return (
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-[14px] text-emerald-700">
        Everything reconciles — no adjustments required.
      </div>
    );

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[15px] font-semibold text-slate-900">Required Adjustments <span className="font-normal text-slate-400">({items.length})</span></h2>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map(({ m, rec }) => {
          const priority = categoryOf(m.status) === "fundserv_only" || categoryOf(m.status) === "winfund_only" ? "high" : "medium";
          const context = [rec.plan && `Plan ${rec.plan}`, rec.fund && `Fund ${rec.fund}`, rec.client].filter(Boolean).join(" · ");
          return (
            <div key={m.id} className="rounded-xl border border-[var(--hairline)] bg-white p-4">
              <div className="flex items-center gap-2">
                <MatchStatusBadge status={m.status} />
                <span className="ml-auto"><SeverityBadge severity={m.status.includes("MISMATCH") ? "medium" : (priority as "high")} /></span>
              </div>
              {context && <p className="mt-2 text-[12.5px] text-slate-600">{context}</p>}
              {(rec.fundservAmountCents !== null || rec.winfundAmountCents !== null) && (
                <p className="mt-1 text-[12.5px] tabular-nums text-slate-600">
                  {rec.fundservAmountCents !== null && `Fundserv ${formatMoney(rec.fundservAmountCents)}`}
                  {rec.fundservAmountCents !== null && rec.winfundAmountCents !== null && "  ·  "}
                  {rec.winfundAmountCents !== null && `Winfund ${formatMoney(rec.winfundAmountCents)}`}
                </p>
              )}
              <p className="mt-2 text-[13px] text-slate-800"><span className="font-semibold">Review: </span>{rec.action}</p>
              {rec.adjustment && <p className="mt-1 text-[13px] text-brand"><span className="font-semibold">Possible adjustment: </span>{rec.adjustment}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExportBtn({ icon: Icon, label, onClick }: { icon: typeof FileDown; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--hairline)] bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
