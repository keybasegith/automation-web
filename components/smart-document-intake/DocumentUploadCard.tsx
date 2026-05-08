"use client";

import { Upload, FileText, FlaskConical } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

export interface UploadFormValues {
  clientName: string;
  clientId: string;
  advisorName: string;
}

interface Props {
  values: UploadFormValues;
  onValuesChange: (values: UploadFormValues) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onAnalyze: () => void;
  onLoadDemo?: () => void;
  isProcessing: boolean;
  error: string | null;
  showDemoButton: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function DocumentUploadCard({
  values,
  onValuesChange,
  file,
  onFileChange,
  onAnalyze,
  onLoadDemo,
  isProcessing,
  error,
  showDemoButton,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = (f: File | null) => {
    setLocalError(null);
    if (!f) {
      onFileChange(null);
      return;
    }
    const isPdf =
      f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setLocalError("Only PDF files are accepted.");
      onFileChange(null);
      return;
    }
    onFileChange(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const canAnalyze =
    !!file && !isProcessing && values.clientName.trim().length > 0;

  const displayedError = error ?? localError;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
            Upload Client Document Package
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Provide the client information and the combined PDF that contains
            their onboarding documents.
          </p>
        </div>
        {showDemoButton && onLoadDemo && (
          <button
            type="button"
            onClick={onLoadDemo}
            disabled={isProcessing}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <FlaskConical className="h-4 w-4" />
            Load Demo Result
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-700">
            Client Name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={values.clientName}
            onChange={(e) =>
              onValuesChange({ ...values, clientName: e.target.value })
            }
            placeholder="e.g. Jane Smith"
            disabled={isProcessing}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-700">
            Client ID / Account Number{" "}
            <span className="text-slate-400">(optional)</span>
          </span>
          <input
            type="text"
            value={values.clientId}
            onChange={(e) =>
              onValuesChange({ ...values, clientId: e.target.value })
            }
            placeholder="e.g. ACC-100245"
            disabled={isProcessing}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50"
          />
        </label>
        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-xs font-medium text-slate-700">
            Advisor Name <span className="text-slate-400">(optional)</span>
          </span>
          <input
            type="text"
            value={values.advisorName}
            onChange={(e) =>
              onValuesChange({ ...values, advisorName: e.target.value })
            }
            placeholder="e.g. Alex Wong"
            disabled={isProcessing}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50"
          />
        </label>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isProcessing && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-brand bg-brand-soft"
            : "border-slate-300 bg-slate-50/50 hover:border-brand"
        } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
      >
        <Upload className="h-6 w-6 text-slate-500" />
        <p className="text-sm font-medium text-slate-700">
          Drag and drop a combined PDF here
        </p>
        <p className="text-xs text-slate-500">PDF only. Up to ~50 MB.</p>
        <p className="text-xs text-slate-400">
          (or click anywhere in this area to choose a file)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand ring-1 ring-slate-200">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatBytes(file.size)} ·{" "}
              <span className="text-emerald-700">Ready to analyze</span>
            </p>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {displayedError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {displayedError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {isProcessing ? "Analyzing…" : "Analyze & Split Document"}
        </button>
        {!values.clientName.trim() && (
          <p className="text-xs text-slate-500">
            Enter a client name before analyzing.
          </p>
        )}
      </div>
    </section>
  );
}
