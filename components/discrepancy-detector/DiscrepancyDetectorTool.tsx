"use client";

/**
 * The shell that turns the rules engine into a usable review: upload → verify →
 * results.
 *
 * Everything runs in the reviewer's own tab. The PDFs are read by pdf.js from an
 * ArrayBuffer, rasterized to data: URLs for the page preview, and never sent
 * anywhere — there is no upload endpoint behind this screen and no API route to
 * add one to.
 *
 * The step order is the compliance guarantee, not a UI preference: extraction
 * only ever PRE-FILLS the verification screen, a human confirms every value, and
 * only then does `runRules` see the data. Skipping straight from a PDF to a
 * verdict is exactly what this tool is built not to do.
 */

import { useCallback, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import CrqFields from "./CrqFields";
import DocumentPane from "./DocumentPane";
import NaafFields from "./NaafFields";
import ResultsPanel from "./ResultsPanel";
import { Pill } from "./ui";
import {
  appendAuditEntry,
  downloadAuditLog,
  readAuditLog,
} from "@/lib/discrepancy-detector/audit";
import { blankCrq, blankNaaf } from "@/lib/discrepancy-detector/blank";
import { detectDocKind, extractCrq, extractNaaf } from "@/lib/discrepancy-detector/extract";
import {
  TEMPLATE_URL,
  loadFieldBoxes,
  naafOcrFields,
  ocrFieldsFromTemplate,
  toFieldMap,
} from "@/lib/discrepancy-detector/ocrTemplate";
import { readPdf, renderPageImages } from "@/lib/discrepancy-detector/pdf";
import { ALL_RULE_CODES, runRules } from "@/lib/discrepancy-detector/rules";
import type {
  Advisor,
  AuditEntry,
  CrqData,
  ExtractionMode,
  NaafData,
  RulesReport,
  SourceMap,
} from "@/lib/discrepancy-detector/types";

type DocKind = "naaf" | "crq";
type Step = "upload" | "verify" | "results";

interface DocSlot {
  fileName: string;
  mode: ExtractionMode;
  warnings: string[];
  pageCount: number;
  /** Page images as local data: URLs. Empty when rasterizing failed. */
  images: string[];
  /** How many boxes the OCR pass filled, when one ran. */
  ocrFilled?: number;
}

const DOC_LABEL: Record<DocKind, string> = {
  naaf: "NAAF",
  crq: "CRQ",
};

export default function DiscrepancyDetectorTool() {
  const [step, setStep] = useState<Step>("upload");

  const [naafSlot, setNaafSlot] = useState<DocSlot | null>(null);
  const [crqSlot, setCrqSlot] = useState<DocSlot | null>(null);
  const [naaf, setNaaf] = useState<NaafData>(blankNaaf);
  const [crq, setCrq] = useState<CrqData>(blankCrq);
  const [sources, setSources] = useState<SourceMap>({});

  const [busy, setBusy] = useState<DocKind | null>(null);
  const [ocrProgress, setOcrProgress] = useState<{
    kind: DocKind;
    done: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [report, setReport] = useState<RulesReport | null>(null);
  const [activeTab, setActiveTab] = useState<DocKind>("naaf");
  const [sameClientOverride, setSameClientOverride] = useState(false);
  // Null until this session writes its first record. The log lives in
  // localStorage, which does not exist during the static render of this page,
  // so the count is never read while rendering — only after a write, and at
  // click time in the download handler.
  const [auditCount, setAuditCount] = useState<number | null>(null);
  const [emptyLogNotice, setEmptyLogNotice] = useState(false);

  // ---------------------------------------------------------------------------
  // Ingestion
  // ---------------------------------------------------------------------------

  const ingest = useCallback(async (kind: DocKind, file: File) => {
    setError(null);
    setBusy(kind);
    try {
      const buffer = await file.arrayBuffer();
      // pdf.js may transfer the buffer to its worker and detach it, so each
      // pass gets its own copy.
      const read = await readPdf(buffer.slice(0));
      let extracted = kind === "naaf" ? extractNaaf(read) : extractCrq(read);
      let ocrFilled: number | undefined;

      // A flattened export carries no form fields at all, so the field-name
      // path above finds nothing. Fall back to reading the boxes off the page
      // image, using the blank form as a template for where they are.
      //
      // Only the client-side form for now: the CRQ arrives fillable, and a
      // template needs a blank of the matching revision, which we hold for the
      // NAAF and the KYC but not for every CRQ revision in circulation.
      // Only when the revision is recognised: the template IS a blank of that
      // exact revision, so running it against a different one crops the wrong
      // places on the page and returns confident-looking nonsense.
      const docKind = detectDocKind(read.text);
      if (kind === "naaf" && docKind && Object.keys(read.fields).length === 0) {
        setOcrProgress({ kind, done: 0, total: 1 });
        try {
          const boxes = await loadFieldBoxes(TEMPLATE_URL[docKind]);
          const fields = naafOcrFields();
          const values = await ocrFieldsFromTemplate({
            bytes: buffer.slice(0),
            boxes,
            fields,
            onProgress: (done, total) => setOcrProgress({ kind, done, total }),
          });
          ocrFilled = Object.keys(values).length;
          if (ocrFilled > 0) {
            // The OCR result is keyed by the same field names a fillable form
            // uses, so the extraction rules run over it unchanged.
            extracted = extractNaaf(
              { ...read, fields: toFieldMap(values) },
              "ocr"
            );
          }
        } catch (err) {
          // A failed OCR pass costs the pre-fill, not the review: the reviewer
          // types the fields as they would have without it.
          console.error("OCR pass failed", err);
        } finally {
          setOcrProgress(null);
        }
      }

      let images: string[] = [];
      try {
        images = await renderPageImages(buffer.slice(0));
      } catch {
        // A failed rasterize costs the reviewer the page preview, not the
        // review — DocumentPane renders a placeholder and the fields still work.
      }

      const slot: DocSlot = {
        fileName: file.name,
        mode: extracted.mode,
        warnings: extracted.warnings,
        pageCount: extracted.pageCount,
        images,
        ocrFilled,
      };

      if (kind === "naaf") {
        setNaafSlot(slot);
        setNaaf(extracted.data as NaafData);
      } else {
        setCrqSlot(slot);
        setCrq(extracted.data as CrqData);
      }
      // NAAF and CRQ keys never collide, so one merged provenance map serves
      // both halves of the verification screen.
      setSources((prev) => ({ ...prev, ...extracted.sources }));
    } catch (err) {
      setError(
        `${DOC_LABEL[kind]} could not be read: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setBusy(null);
    }
  }, []);

  const clearDoc = (kind: DocKind) => {
    if (kind === "naaf") {
      setNaafSlot(null);
      setNaaf(blankNaaf());
    } else {
      setCrqSlot(null);
      setCrq(blankCrq());
    }
    setReport(null);
  };

  const resetAll = () => {
    setNaafSlot(null);
    setCrqSlot(null);
    setNaaf(blankNaaf());
    setCrq(blankCrq());
    setSources({});
    setReport(null);
    setSameClientOverride(false);
    setError(null);
    setActiveTab("naaf");
    setStep("upload");
  };

  // ---------------------------------------------------------------------------
  // Audit
  // ---------------------------------------------------------------------------

  /**
   * Append-only: each event in a review (checks run, override acknowledged,
   * draft produced) is its own timestamped record rather than a mutation of an
   * earlier one, which is what an audit log is for.
   */
  const recordAudit = useCallback(
    (
      forReport: RulesReport,
      patch: Partial<Pick<AuditEntry, "advisor_name" | "advisor_email" | "draft_generated" | "same_client_override">>
    ) => {
      const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        client_id: naaf.naaf_client_id,
        naaf_file: naafSlot?.fileName ?? "",
        crq_file: crqSlot?.fileName ?? "",
        rules_evaluated: [...ALL_RULE_CODES],
        results: forReport.results.map((r) => ({
          code: r.code,
          key: r.key,
          status: r.status,
        })),
        advisor_name: null,
        advisor_email: null,
        draft_generated: false,
        same_client_override: sameClientOverride,
        ...patch,
      };
      appendAuditEntry(entry);
      setAuditCount(readAuditLog().length);
      setEmptyLogNotice(false);
    },
    [naaf.naaf_client_id, naafSlot, crqSlot, sameClientOverride]
  );

  const runChecks = () => {
    const next = runRules({ naaf, crq });
    setReport(next);
    setSameClientOverride(false);
    // Stated explicitly: setSameClientOverride above has not landed in the
    // closure recordAudit reads, so a re-run after an override would otherwise
    // inherit the previous run's acknowledgement.
    recordAudit(next, { same_client_override: false });
    setStep("results");
  };

  const handleDraftGenerated = useCallback(
    (advisor: Advisor | null) => {
      if (!report || !advisor) return;
      recordAudit(report, {
        advisor_name: advisor.advisor_name,
        advisor_email: advisor.email,
        draft_generated: true,
      });
    },
    [report, recordAudit]
  );

  const toggleOverride = (checked: boolean) => {
    setSameClientOverride(checked);
    if (checked && report) {
      recordAudit(report, { same_client_override: true });
    }
  };

  const downloadLog = () => {
    if (readAuditLog().length === 0) {
      setEmptyLogNotice(true);
      return;
    }
    downloadAuditLog();
  };

  const bothLoaded = Boolean(naafSlot && crqSlot);
  const x1Failed =
    report?.deficiencies.some((d) => d.code === "X1") ?? false;

  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      <StepBar step={step} />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-rose-500 transition hover:text-rose-700"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {step === "upload" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadZone
              kind="naaf"
              title="NAAF or KYC Update"
              description="The client-side form for this account — a new-account NAAF or a Know Your Client Update."
              slot={naafSlot}
              busy={busy === "naaf"}
              ocr={ocrProgress?.kind === "naaf" ? ocrProgress : null}
              onFile={(f) => ingest("naaf", f)}
              onRemove={() => clearDoc("naaf")}
            />
            <UploadZone
              kind="crq"
              title="Client Risk Questionnaire"
              description="The matching CRQ for the same client."
              slot={crqSlot}
              busy={busy === "crq"}
              ocr={ocrProgress?.kind === "crq" ? ocrProgress : null}
              onFile={(f) => ingest("crq", f)}
              onRemove={() => clearDoc("crq")}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!bothLoaded}
              onClick={() => setStep("verify")}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-[13px] font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              Verify the extracted fields <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {!bothLoaded && (
              <p className="text-[12px] text-slate-500">
                Both documents are needed — every cross-document rule compares one
                against the other.
              </p>
            )}
          </div>
        </>
      )}

      {step === "verify" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(["naaf", "crq"] as const).map((kind) => {
              const slot = kind === "naaf" ? naafSlot : crqSlot;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setActiveTab(kind)}
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[13px] font-medium transition ${
                    activeTab === kind
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {DOC_LABEL[kind]}
                  {slot?.mode === "manual" && <Pill tone="manual">Manual</Pill>}
                </button>
              );
            })}
            <p className="ml-auto text-[12px] text-slate-500">
              Amber fields still need your eyes. Nothing is checked until you run
              the review.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="lg:sticky lg:top-6 lg:self-start">
              {activeTab === "naaf" && naafSlot && (
                <DocumentPane
                  title="NAAF"
                  fileName={naafSlot.fileName}
                  images={naafSlot.images}
                  mode={naafSlot.mode}
                  warnings={naafSlot.warnings}
                />
              )}
              {activeTab === "crq" && crqSlot && (
                <DocumentPane
                  title="CRQ"
                  fileName={crqSlot.fileName}
                  images={crqSlot.images}
                  mode={crqSlot.mode}
                  warnings={crqSlot.warnings}
                />
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              {activeTab === "naaf" ? (
                <NaafFields data={naaf} sources={sources} onChange={setNaaf} />
              ) : (
                <CrqFields data={crq} sources={sources} onChange={setCrq} />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <button
              type="button"
              onClick={runChecks}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-[13px] font-medium text-white transition hover:bg-brand-hover"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Run the compliance review
            </button>
            <p className="text-[12px] text-slate-500">
              {ALL_RULE_CODES.length} rules run against the values above.
            </p>
          </div>
        </>
      )}

      {step === "results" && report && (
        <>
          {x1Failed && (
            <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
              <input
                type="checkbox"
                checked={sameClientOverride}
                onChange={(e) => toggleOverride(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-[var(--brand)]"
              />
              <span className="text-[12px] leading-relaxed text-amber-900">
                I have separately confirmed these two documents belong to the same
                client. This is recorded in the audit log; it does not clear the
                finding below.
              </span>
            </label>
          )}

          <ResultsPanel
            data={{ naaf, crq }}
            report={report}
            onDraftGenerated={handleDraftGenerated}
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setStep("verify")}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Correct a field and re-run
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Review another client
            </button>
          </div>
        </>
      )}

      <footer className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 text-[12px] text-slate-500">
        <p>
          PDFs are read in this browser tab. Nothing is uploaded, and this tool
          never sends an email.
        </p>
        {emptyLogNotice && (
          <p className="text-[12px] text-amber-700">
            The audit log on this browser is empty — run a review first.
          </p>
        )}
        <button
          type="button"
          onClick={downloadLog}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Download className="h-3.5 w-3.5" />
          Download audit log{auditCount ? ` (${auditCount})` : ""}
        </button>
      </footer>
    </div>
  );
}

// -----------------------------------------------------------------------------

const STEPS: Array<{ key: Step; label: string }> = [
  { key: "upload", label: "1. Documents" },
  { key: "verify", label: "2. Verify fields" },
  { key: "results", label: "3. Findings" },
];

function StepBar({ step }: { step: Step }) {
  const current = STEPS.findIndex((s) => s.key === step);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={`inline-flex h-7 items-center rounded-full px-3 text-[12px] font-medium transition ${
              i === current
                ? "bg-brand text-white"
                : i < current
                  ? "bg-brand-soft text-brand"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <span className="h-px w-5 bg-slate-200" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  );
}

function UploadZone({
  kind,
  title,
  description,
  slot,
  busy,
  ocr,
  onFile,
  onRemove,
}: {
  kind: DocKind;
  title: string;
  description: string;
  slot: DocSlot | null;
  busy: boolean;
  ocr: { done: number; total: number } | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (slot) {
    return (
      <div className="rounded-2xl border border-[var(--hairline)] bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900">
              {DOC_LABEL[kind]}
            </p>
            <p className="truncate text-[12px] text-slate-500" title={slot.fileName}>
              {slot.fileName}
            </p>
          </div>
          <span className="ml-auto">
            <Pill tone={slot.mode === "parsed" ? "ok" : "manual"}>
              {slot.mode === "parsed" ? "Text layer read" : "Manual entry"}
            </Pill>
          </span>
        </div>

        <p className="mt-3 text-[12px] text-slate-500">
          {slot.pageCount} {slot.pageCount === 1 ? "page" : "pages"}
          {slot.ocrFilled ? ` · ${slot.ocrFilled} boxes read from the page image` : ""}
        </p>

        {slot.warnings.map((w) => (
          <p
            key={w}
            className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-700"
          >
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {w}
          </p>
        ))}

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[12px] font-medium text-brand transition hover:underline"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-[12px] font-medium text-slate-500 transition hover:text-rose-600"
          >
            Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`flex min-h-[210px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
        drag ? "border-brand bg-brand-soft/60" : "border-slate-300 bg-slate-50/60"
      }`}
    >
      {busy ? (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
          <p className="mt-2 text-[13px] text-slate-500">
            {ocr
              ? `This form is flattened — reading the boxes off the page image (${ocr.done}/${ocr.total})…`
              : "Reading the PDF…"}
          </p>
        </>
      ) : (
        <>
          <UploadCloud
            className={`h-8 w-8 ${drag ? "text-brand" : "text-slate-400"}`}
          />
          <p className="mt-2 text-[15px] font-semibold text-slate-800">{title}</p>
          <p className="mt-0.5 max-w-xs text-[13px] text-slate-500">{description}</p>
          <p className="mt-1 text-[11px] text-slate-400">PDF only</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-white transition hover:bg-brand-hover"
          >
            <UploadCloud className="h-3.5 w-3.5" /> Browse file
          </button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </div>
  );
}
