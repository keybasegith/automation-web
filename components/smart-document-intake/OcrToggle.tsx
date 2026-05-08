"use client";

import { ScanLine, Info } from "lucide-react";

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export default function OcrToggle({ enabled, onChange, disabled }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <ScanLine className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">
              Use OCR for image-only pages
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              When ON, scanned/image-only pages are read with on-device OCR
              (Tesseract) before classification. OCR runs entirely in your
              browser — no page contents leave the device. First use downloads
              the English language data (~10–15&nbsp;MB).
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-700">
            {enabled ? "On" : "Off"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
              enabled ? "bg-brand" : "bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {enabled && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
          <p>
            OCR adds 5–15 seconds per scanned page. The classifier still does
            the final review — OCR only fills in text for pages that have no
            text layer.
          </p>
        </div>
      )}
    </section>
  );
}
