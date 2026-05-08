"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { SAMPLE_KEYS, SAMPLE_LABELS } from "@/lib/forms/sampleNaafData";

export default function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<null | "upload" | "sample">(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const onSelectFile = (f: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setError(null);
    setWarnings([]);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onSelectFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setBusy("upload");
    setError(null);
    setWarnings([]);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/form-processing/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Upload failed (${res.status})`);
        return;
      }
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setWarnings(data.warnings as string[]);
      }
      router.push(
        `/dashboard/form-processing/extracted-data/${data.submissionId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const loadSample = async (sampleKey: string) => {
    setBusy("sample");
    setError(null);
    try {
      const res = await fetch("/api/form-processing/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Could not load sample (${res.status})`);
        return;
      }
      router.push(
        `/dashboard/form-processing/extracted-data/${data.submissionId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          dragOver
            ? "border-brand bg-brand-soft"
            : "border-slate-300 bg-slate-50/50 hover:border-brand"
        }`}
      >
        <p className="text-sm font-medium text-slate-700">
          Drag and drop a NAAF document here
        </p>
        <p className="text-xs text-slate-500">
          PDF, PNG, JPG, JPEG, or plain text. Max 10MB.
        </p>
        <p className="text-xs text-slate-400">
          (or click anywhere in this area to choose a file)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
          className="hidden"
          onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {file && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-900">
            Selected: <span className="font-mono">{file.name}</span>
          </p>
          <p className="text-xs text-slate-500">
            {file.type || "unknown type"} · {Math.round(file.size / 1024)} KB
          </p>
          {previewUrl && (
            // Local blob URL preview — next/image isn't applicable here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview"
              className="mt-3 max-h-64 rounded-lg border border-slate-200"
            />
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={upload}
              disabled={busy !== null}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {busy === "upload" ? "Extracting…" : "Extract NAAF data"}
            </button>
            <button
              type="button"
              onClick={() => onSelectFile(null)}
              disabled={busy !== null}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Extraction warnings:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          Demo
        </p>
        <p className="mt-1 text-sm text-slate-700">
          Don&apos;t have a NAAF? Load one of three pre-built samples to walk
          through the full workflow:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => loadSample(k)}
              disabled={busy !== null}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "sample" ? "Loading…" : `Load: ${SAMPLE_LABELS[k]}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
