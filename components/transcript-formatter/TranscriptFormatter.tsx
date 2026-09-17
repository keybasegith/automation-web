"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Eraser, Lock, RotateCcw, WandSparkles } from "lucide-react";

import {
  DEFAULT_TRANSCRIPT_OPTIONS,
  countWords,
  formatTranscript,
  type TranscriptOptions,
} from "@/lib/transcript-formatter/format";
import { exportTranscriptDocx } from "@/lib/transcript-formatter/exportTranscriptDocx";
import TranscriptOptionsPanel from "./TranscriptOptions";

/**
 * The Transcript Formatter workspace.
 *
 * Everything here is component state and nothing else: no fetch, no storage,
 * no logging. A refresh empties the tool, which is the intended behaviour for
 * a one-off utility handling meeting audio transcripts.
 */

const PANEL = "rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const PRIMARY_BUTTON =
  "inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BUTTON =
  "inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const EDITOR =
  "w-full flex-1 resize-y rounded-xl border border-[var(--hairline-strong)] bg-white px-3.5 py-3 text-[13px] leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20";

type Notice = { tone: "error" | "success"; text: string } | null;

const describe = (text: string): string =>
  `${text.length.toLocaleString()} character${text.length === 1 ? "" : "s"} · ${countWords(
    text
  ).toLocaleString()} word${countWords(text) === 1 ? "" : "s"}`;

export default function TranscriptFormatter() {
  const [raw, setRaw] = useState("");
  const [cleaned, setCleaned] = useState("");
  /** What Clean Transcript produced, so a manual edit can be undone. */
  const [lastCleaned, setLastCleaned] = useState("");
  const [options, setOptions] = useState<TranscriptOptions>(DEFAULT_TRANSCRIPT_OPTIONS);
  const [notice, setNotice] = useState<Notice>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const setOption = useCallback((key: keyof TranscriptOptions, value: boolean) => {
    setOptions((current) => ({ ...current, [key]: value }));
  }, []);

  function handleClean() {
    if (raw.trim().length === 0) {
      setNotice({ tone: "error", text: "Please paste a transcript before cleaning." });
      return;
    }

    const result = formatTranscript(raw, options);
    setCleaned(result);
    setLastCleaned(result);

    const segments = result.split("\n").filter((line) => line.trim().length > 0).length;
    setNotice({
      tone: "success",
      text:
        segments === 0
          ? "Nothing was left after cleaning. Check the options and try again."
          : `Cleaned — ${segments.toLocaleString()} segment${segments === 1 ? "" : "s"}.`,
    });
  }

  function handleClear() {
    setRaw("");
    setCleaned("");
    setLastCleaned("");
    setNotice(null);
    setCopied(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cleaned);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setNotice({
        tone: "error",
        text: "The browser would not give access to the clipboard. Select the text and copy it manually.",
      });
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportTranscriptDocx(cleaned);
    } catch {
      setNotice({ tone: "error", text: "The Word file could not be generated. Please try again." });
    } finally {
      setExporting(false);
    }
  }

  const hasCleaned = cleaned.trim().length > 0;
  const edited = hasCleaned && cleaned !== lastCleaned;

  return (
    <div className="flex flex-col gap-5">
      <section className={`${PANEL} p-5`}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Options</h3>
          <p className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            Transcript content is processed locally in your browser and is not stored.
          </p>
        </div>

        <TranscriptOptionsPanel options={options} onChange={setOption} />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className={`${PANEL} flex flex-col p-5`}>
          <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
              <label htmlFor="raw-transcript">Raw Transcript</label>
            </h3>
            <span className="text-[12px] tabular-nums text-slate-500">{describe(raw)}</span>
          </header>

          <textarea
            id="raw-transcript"
            value={raw}
            spellCheck={false}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="Paste your raw transcript here..."
            className={`${EDITOR} min-h-[420px] font-mono`}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={handleClean} className={PRIMARY_BUTTON}>
              <WandSparkles className="h-4 w-4" aria-hidden />
              Clean Transcript
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={raw.length === 0 && cleaned.length === 0}
              className={SECONDARY_BUTTON}
            >
              <Eraser className="h-4 w-4" aria-hidden />
              Clear
            </button>
          </div>

          <p
            role="status"
            aria-live="polite"
            className={`mt-3 min-h-[18px] text-[12px] ${
              notice?.tone === "error" ? "text-rose-700" : "text-slate-500"
            }`}
          >
            {notice?.text ?? ""}
          </p>
        </section>

        <section className={`${PANEL} flex flex-col p-5`}>
          <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
              <label htmlFor="cleaned-transcript">Cleaned Transcript</label>
            </h3>
            <span className="text-[12px] tabular-nums text-slate-500">{describe(cleaned)}</span>
          </header>

          <textarea
            id="cleaned-transcript"
            value={cleaned}
            spellCheck={false}
            onChange={(event) => setCleaned(event.target.value)}
            placeholder="Your cleaned transcript will appear here."
            className={`${EDITOR} min-h-[420px]`}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={!hasCleaned}
              className={SECONDARY_BUTTON}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={!hasCleaned || exporting}
              className={PRIMARY_BUTTON}
            >
              <Download className="h-4 w-4" aria-hidden />
              {exporting ? "Preparing…" : "Export as Word"}
            </button>
            {edited ? (
              <button
                type="button"
                onClick={() => setCleaned(lastCleaned)}
                className={SECONDARY_BUTTON}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Reset to cleaned version
              </button>
            ) : null}
          </div>

          <p className="mt-3 min-h-[18px] text-[12px] text-slate-500">
            {hasCleaned
              ? "Edit the text above before exporting — the Word file uses exactly what is shown here."
              : ""}
          </p>
        </section>
      </div>
    </div>
  );
}
