"use client";

import { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { DocumentSlot } from "@/lib/bp-settlement/constants";
import type { SettlementFileType } from "@/lib/bp-settlement/types";

export interface UploadedFileState {
  id: string;
  name: string;
  size: number;
  status: "validating" | "parsing" | "parsed" | "manual" | "error";
  validationError?: string;
  detectedType?: SettlementFileType;
  classificationConfidence?: number;
  rowOrPageCount?: number;
  warnings: string[];
  parsingErrors: string[];
}

const FILE_TYPE_LABEL: Record<SettlementFileType, string> = {
  FUNDSERV_CATEGORY_SUMMARY: "Category Summary",
  FUNDSERV_DETAIL: "Fundserv Details",
  WINFUND_UNSETTLED: "Winfund Not Settled",
  UNKNOWN: "Unclassified",
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_ICON = {
  validating: <Loader2 className="h-4 w-4 animate-spin text-slate-400" />,
  parsing: <Loader2 className="h-4 w-4 animate-spin text-sky-500" />,
  parsed: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  manual: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error: <AlertTriangle className="h-4 w-4 text-rose-500" />,
} as const;

const ALL_TYPES: SettlementFileType[] = [
  "FUNDSERV_CATEGORY_SUMMARY",
  "FUNDSERV_DETAIL",
  "WINFUND_UNSETTLED",
];

export function UploadCard({
  slot,
  files,
  onAddFiles,
  onRemove,
  onReassign,
  disabled,
}: {
  slot: DocumentSlot;
  files: UploadedFileState[];
  onAddFiles: (fileList: FileList) => void;
  onRemove: (id: string) => void;
  onReassign: (id: string, type: SettlementFileType) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`rounded-xl border bg-white p-4 transition ${dragOver ? "border-brand ring-2 ring-brand/20" : "border-[var(--hairline)]"}`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled && e.dataTransfer.files.length) onAddFiles(e.dataTransfer.files); }}
    >
      <div>
        <p className="text-[13px] font-semibold text-slate-800">{slot.label}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-slate-400">{slot.description}</p>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
        <span>Formats: {slot.formats}</span>
        {slot.allowMultiple && <span>· multiple allowed</span>}
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="rounded-lg border border-[var(--hairline)] bg-slate-50/60 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-slate-700">{f.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {fmtSize(f.size)}
                    {f.status === "parsed" && f.rowOrPageCount !== undefined && <> · {f.rowOrPageCount} rows/pages</>}
                    {f.detectedType && f.detectedType !== "UNKNOWN" && <> · {FILE_TYPE_LABEL[f.detectedType]}</>}
                    {typeof f.classificationConfidence === "number" && f.status !== "error" && <> · {Math.round(f.classificationConfidence * 100)}%</>}
                  </p>
                </div>
                <span className="shrink-0">{STATUS_ICON[f.status]}</span>
                <button type="button" onClick={() => onRemove(f.id)} className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600" aria-label="Remove file">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {f.validationError && <p className="mt-1 text-[11px] font-medium text-rose-600">{f.validationError}</p>}
              {f.parsingErrors.slice(0, 1).map((w, i) => <p key={i} className="mt-1 text-[11px] text-rose-600">{w}</p>)}
              {f.warnings.slice(0, 2).map((w, i) => <p key={i} className="mt-0.5 text-[11px] text-amber-600">{w}</p>)}
              {/* Manual type assignment when classification is uncertain. */}
              {(f.status === "manual" || (f.detectedType === "UNKNOWN" && f.status !== "error")) && (
                <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                  Assign type:
                  <select
                    value={f.detectedType ?? "UNKNOWN"}
                    onChange={(e) => onReassign(f.id, e.target.value as SettlementFileType)}
                    className="rounded border border-[var(--hairline-strong)] px-1 py-0.5 text-[11px]"
                    disabled={disabled}
                  >
                    <option value="UNKNOWN">Choose…</option>
                    {ALL_TYPES.map((t) => <option key={t} value={t}>{FILE_TYPE_LABEL[t]}</option>)}
                  </select>
                </label>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <input ref={inputRef} type="file" accept=".pdf,.xlsx,.xls" multiple={slot.allowMultiple} className="hidden" disabled={disabled}
          onChange={(e) => { if (e.target.files?.length) onAddFiles(e.target.files); e.target.value = ""; }} />
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--hairline-strong)] px-3 py-2 text-[12px] font-medium text-slate-500 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50">
          {files.length > 0 ? <RefreshCw className="h-3.5 w-3.5" /> : <UploadCloud className="h-4 w-4" />}
          {files.length > 0 ? (slot.allowMultiple ? "Add another file" : "Replace file") : "Select or drop file"}
        </button>
      </div>
    </div>
  );
}
