"use client";

import { FileText, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  isUploading: boolean;
  error: string | null;
}

const ACCEPT = ".xlsx,.xls,.csv";
const MAX_BYTES = 50 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SageUploadStep({
  file,
  onFileChange,
  onUpload,
  isUploading,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndSet = (f: File | null) => {
    setLocalError(null);
    if (!f) {
      onFileChange(null);
      return;
    }
    const name = f.name.toLowerCase();
    if (!/\.(xlsx|xls|csv)$/.test(name)) {
      setLocalError("Only .xlsx, .xls, and .csv files are accepted.");
      onFileChange(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setLocalError(`File exceeds ${MAX_BYTES / (1024 * 1024)} MB limit.`);
      onFileChange(null);
      return;
    }
    onFileChange(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSet(f);
  };

  const displayedError = error ?? localError;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">
          Step 1 — Upload Sage 300 Export
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Upload a Sage 300 General Ledger export. Files are parsed on the
          server and never sent to external services.
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-brand bg-brand-soft"
            : "border-slate-300 bg-slate-50/50 hover:border-brand"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <Upload className="h-6 w-6 text-slate-500" />
        <p className="text-sm font-medium text-slate-700">
          Drag and drop the Sage 300 file here
        </p>
        <p className="text-xs text-slate-500">.xlsx, .xls, or .csv — up to 50 MB</p>
        <p className="text-xs text-slate-400">
          (or click anywhere in this area to choose a file)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)}
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
              <span className="text-emerald-700">Ready to parse</span>
            </p>
          </div>
          {!isUploading && (
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

      <div className="mt-5">
        <button
          type="button"
          onClick={onUpload}
          disabled={!file || isUploading}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {isUploading ? "Parsing…" : "Parse & Detect Accounts"}
        </button>
      </div>
    </section>
  );
}
