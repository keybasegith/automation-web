"use client";

import { Sparkles, AlertTriangle, Info } from "lucide-react";

interface Props {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  configuredMessage?: string | null;
  isConfiguredKnown: boolean;
  isConfigured: boolean | null;
}

export default function AIClassificationToggle({
  enabled,
  onChange,
  disabled,
  configuredMessage,
  isConfiguredKnown,
  isConfigured,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900">
              Use AI for low-confidence pages
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-slate-500">
              When ON, only pages with confidence below 85% are sent to the
              optional AI classifier as a second opinion. Keyword classifier
              results are used as the default — AI never approves a document.
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
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            AI classification may process extracted document text. Use only if
            approved by company policy. The AI is restricted to suggesting a
            likely document type; it never approves, validates, or comments on
            compliance.
          </p>
        </div>
      )}

      {isConfiguredKnown && isConfigured === false && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
          <p>
            {configuredMessage ??
              "AI classification is not configured on the server. Keyword classification will be used."}
          </p>
        </div>
      )}
    </section>
  );
}
