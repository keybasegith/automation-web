"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ArrowDown, ArrowUp, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import {
  MERGE_DOCUMENT_TYPES,
  sortByRecommendedOrder,
  type MergeDocumentType,
} from "@/lib/document-intake/mergePdfs";
import { convertFileToPdf } from "@/lib/document-intake/fileToPdf";

const MAX_FILE_MB = 30;

const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".heic",
  ".heif",
];
const ACCEPT_ATTR = "application/pdf,image/*,.heic,.heif";

const isAcceptedFile = (file: File): boolean => {
  const lower = file.name.toLowerCase();
  if (file.type === "application/pdf") return true;
  if (file.type.startsWith("image/")) return true;
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

interface MergeFileItem {
  id: string;
  /** The original file the user dropped — kept for display (name/size). */
  originalFile: File;
  /** PDF version sent to the server. Identical to originalFile when it's already a PDF. */
  pdfFile: File;
  documentType: MergeDocumentType;
  /** True while the file is being converted from image → PDF. */
  converting: boolean;
  /** Set if conversion failed for this file. */
  conversionError?: string;
}

interface MergeResult {
  filename: string;
  pageCount: number | null;
  fileCount: number;
  createdAt: string;
  blobUrl: string;
  /** Free for the consumer to revoke when the result is replaced. */
  revoke: () => void;
}

const DEFAULT_TYPE: MergeDocumentType = "Supporting Document";

const newId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `merge-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

const inferTypeFromName = (name: string): MergeDocumentType => {
  const n = name.toLowerCase();
  if (n.includes("naaf")) return "NAAF";
  if (n.includes("kyc")) return "KYC";
  if (n.includes("crq")) return "CRQ";
  if (n.includes("passport")) return "Passport";
  if (n.includes("driver") || n.includes("licence") || n.includes("license")) {
    return "Driver's License";
  }
  if (n.includes("statement")) return "Statement";
  if (n.includes("id") || n.includes("identity")) return "Identity Document";
  return DEFAULT_TYPE;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function DocumentMergePanel() {
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [advisorName, setAdvisorName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [items, setItems] = useState<MergeFileItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const anyConverting = useMemo(
    () => items.some((it) => it.converting),
    [items]
  );

  const canMerge =
    !busy &&
    !anyConverting &&
    clientName.trim().length > 0 &&
    items.length >= 2;

  const totalBytes = useMemo(
    () => items.reduce((sum, item) => sum + item.originalFile.size, 0),
    [items]
  );

  const replaceResult = (next: MergeResult | null) => {
    if (result) result.revoke();
    setResult(next);
  };

  const addFiles = (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;
    const accepted: MergeFileItem[] = [];
    const rejected: string[] = [];
    for (const file of list) {
      if (!isAcceptedFile(file)) {
        rejected.push(`${file.name} (unsupported file type)`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        rejected.push(`${file.name} (over ${MAX_FILE_MB}MB)`);
        continue;
      }
      accepted.push({
        id: newId(),
        originalFile: file,
        pdfFile: file,
        documentType: inferTypeFromName(file.name),
        // Every file goes through the converter — plain PDFs return instantly
        // after a fast preflight load; images and encrypted PDFs are
        // rasterized into clean PDFs the merge route can read.
        converting: true,
      });
    }
    if (accepted.length > 0) {
      setItems((prev) => [...prev, ...accepted]);
      setError(null);
      for (const item of accepted) {
        void convertItem(item.id, item.originalFile);
      }
    }
    if (rejected.length > 0) {
      setError(`Skipped: ${rejected.join("; ")}`);
    }
  };

  const convertItem = async (id: string, source: File) => {
    try {
      const pdfFile = await convertFileToPdf(source);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, pdfFile, converting: false, conversionError: undefined }
            : it
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, converting: false, conversionError: msg }
            : it
        )
      );
    }
  };

  const onFilePicker = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    // reset so the same file can be re-chosen later
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
  };

  const move = (id: string, direction: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const [removed] = next.splice(idx, 1);
      next.splice(target, 0, removed);
      return next;
    });
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const setItemType = (id: string, type: MergeDocumentType) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, documentType: type } : it))
    );
  };

  const autoSort = () => {
    setItems((prev) => sortByRecommendedOrder(prev));
  };

  const merge = async () => {
    if (!canMerge) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("clientName", clientName.trim());
      if (clientId.trim()) formData.set("clientId", clientId.trim());
      if (advisorName.trim()) formData.set("advisorName", advisorName.trim());
      if (packageName.trim()) formData.set("packageName", packageName.trim());
      const failed = items.filter((it) => it.conversionError);
      if (failed.length > 0) {
        setError(
          `Cannot merge — ${failed.length} file(s) failed to convert: ${failed
            .map((f) => f.originalFile.name)
            .join(", ")}`
        );
        setBusy(false);
        return;
      }
      items.forEach((item, idx) => {
        formData.append("files", item.pdfFile, item.pdfFile.name);
        formData.append("fileOrder", String(idx));
        formData.append("documentTypes", item.documentType);
      });

      const res = await fetch("/api/documents/merge", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let message = `Merge failed (${res.status})`;
        try {
          const data = (await res.json()) as { error?: string; detail?: string };
          if (data.error) {
            message = data.detail ? `${data.error} — ${data.detail}` : data.error;
          }
        } catch {
          /* binary error response — ignore */
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const filename =
        res.headers.get("X-Merged-Filename") ?? "Merged_Client_Package.pdf";
      const pageCountRaw = res.headers.get("X-Merged-Page-Count");
      const fileCountRaw = res.headers.get("X-Merged-File-Count");
      const createdAt =
        res.headers.get("X-Merged-Created-At") ?? new Date().toISOString();

      replaceResult({
        filename,
        pageCount: pageCountRaw ? Number(pageCountRaw) : null,
        fileCount: fileCountRaw ? Number(fileCountRaw) : items.length,
        createdAt,
        blobUrl,
        revoke: () => URL.revokeObjectURL(blobUrl),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">
              Merge Client Documents
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Upload separate reviewed documents and combine them into one
              organized client package.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Client name"
            required
            value={clientName}
            onChange={setClientName}
            placeholder="e.g. Sarah Kim"
          />
          <Field
            label="Client ID / account number"
            value={clientId}
            onChange={setClientId}
            placeholder="optional"
          />
          <Field
            label="Advisor name"
            value={advisorName}
            onChange={setAdvisorName}
            placeholder="optional"
          />
          <Field
            label="Package name"
            value={packageName}
            onChange={setPackageName}
            placeholder="e.g. Jane Smith Onboarding Package"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-brand">
              Files to merge
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              {items.length === 0
                ? `Drop PDFs or images (JPG, PNG, HEIC, WebP, GIF, BMP) here or click to choose. Up to ${MAX_FILE_MB}MB per file.`
                : `${items.length} file${items.length === 1 ? "" : "s"} · ${formatBytes(totalBytes)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={autoSort}
              disabled={busy || items.length < 2}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Auto-sort by recommended order
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-8 text-center text-sm transition ${
            dragOver
              ? "border-brand bg-brand-soft/40 text-brand"
              : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100/60"
          }`}
        >
          <p className="font-medium text-slate-700">
            Drop PDFs or images here or click to choose
          </p>
          <p className="text-xs text-slate-500">
            PDF, JPG, PNG, HEIC, WebP, GIF, BMP · up to {MAX_FILE_MB}MB per file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            onChange={onFilePicker}
            className="hidden"
          />
        </div>

        {items.length > 0 && (
          <ul className="mt-5 flex flex-col gap-2">
            {items.map((item, idx) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:flex-nowrap"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[11px] font-semibold text-brand">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {item.originalFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {formatBytes(item.originalFile.size)}
                    {item.converting && (
                      <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Converting to PDF…
                      </span>
                    )}
                    {item.conversionError && (
                      <span className="ml-2 text-red-600">
                        Conversion failed: {item.conversionError}
                      </span>
                    )}
                  </p>
                </div>
                <select
                  value={item.documentType}
                  onChange={(e) =>
                    setItemType(item.id, e.target.value as MergeDocumentType)
                  }
                  disabled={busy}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                >
                  {MERGE_DOCUMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(item.id, -1)}
                    disabled={busy || idx === 0}
                    aria-label="Move up"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(item.id, 1)}
                    disabled={busy || idx === items.length - 1}
                    aria-label="Move down"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={busy}
                    aria-label="Remove file"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={merge}
          disabled={!canMerge}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {busy
            ? "Merging documents…"
            : anyConverting
              ? "Converting files…"
              : "Merge Documents"}
        </button>
      </div>

      {result && <MergeResultCard result={result} clientName={clientName} />}
    </div>
  );
}

function MergeResultCard({
  result,
  clientName,
}: {
  result: MergeResult;
  clientName: string;
}) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-emerald-800">
          Merged package ready
        </h4>
        <span className="text-xs text-emerald-700">
          {new Date(result.createdAt).toLocaleString()}
        </span>
      </header>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
        <ResultField label="Package filename" value={result.filename} />
        <ResultField label="Client" value={clientName || "—"} />
        <ResultField
          label="Files merged"
          value={String(result.fileCount)}
        />
        <ResultField
          label="Total pages"
          value={result.pageCount != null ? String(result.pageCount) : "—"}
        />
      </dl>
      <div className="mt-5 flex justify-end">
        <a
          href={result.blobUrl}
          download={result.filename}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          Download merged PDF
        </a>
      </div>
    </section>
  );
}

function ResultField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
        {label}
      </dt>
      <dd className="text-sm text-emerald-900">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
