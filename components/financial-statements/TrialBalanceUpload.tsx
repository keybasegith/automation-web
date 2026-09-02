"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { PackageDto } from "@/lib/financial-statements/api";
import PackageWorkspace from "./PackageWorkspace";

/**
 * Upload and processing.
 *
 * The stages shown are the real ones the server performed, reported back from
 * the generated result — not an animation. Each line states a fact that can be
 * checked against the package that was just created.
 */
export default function TrialBalanceUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "working" | "done" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PackageDto | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  // Held so the statements can be re-rendered for download where the
  // deployment stores nothing. The bytes never leave this tab otherwise.
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  async function upload(file: File) {
    setState("working");
    setError(null);
    setResult(null);
    setFileName(file.name);
    setSourceFile(file);

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/financial-statements/upload", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The file could not be processed.");
      setResult(body.package as PackageDto);
      setState("done");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The file could not be processed.");
      setState("failed");
    }
  }

  const stages = result
    ? [
        { ok: true, text: `File validated (${result.statementPackage.sourceFileType.toUpperCase()})` },
        { ok: true, text: `${result.trialBalance.rowCount} Trial Balance rows detected` },
        {
          ok: result.trialBalance.isBalanced,
          text: result.trialBalance.isBalanced
            ? `Debit / credit totals reconciled (${result.trialBalance.totalDebits})`
            : `Debits and credits differ by ${result.trialBalance.difference}`,
        },
        {
          ok: result.reconciliation.counts.unmapped + result.reconciliation.counts.ambiguous === 0,
          text:
            result.reconciliation.counts.unmapped + result.reconciliation.counts.ambiguous === 0
              ? `${result.trialBalance.rowCount} accounts checked against GL mapping`
              : `${result.reconciliation.counts.unmapped} unmapped, ${result.reconciliation.counts.ambiguous} ambiguous accounts`,
        },
        { ok: true, text: `Income Statement generated — net income ${result.netIncome}` },
        {
          ok: result.balanceSheetBalanced,
          text: result.balanceSheetBalanced
            ? "Balance Sheet generated and balances"
            : `Balance Sheet out of balance by ${result.balanceSheet.totals.differenceCents}`,
        },
        {
          ok: result.readiness.canFinalize,
          text: result.readiness.canFinalize
            ? "Accounting validations complete"
            : `${result.exceptions.filter((e) => e.severity === "blocking" && e.status === "open").length} blocking exception(s) need review`,
        },
      ]
    : [];

  const panel = (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Upload a Trial Balance</h3>
      <p className="mt-1 text-sm text-slate-500">
        The Balance Sheet and Income Statement are produced from the uploaded figures and the
        approved GL mapping table. Accepted formats: .xls, .xlsx, .csv.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx,.xlsm,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={state === "working"}
          onClick={() => inputRef.current?.click()}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {state === "working" ? "Processing…" : "Upload Trial Balance"}
        </button>
        {fileName ? <span className="font-mono text-xs text-slate-500">{fileName}</span> : null}
      </div>

      {state === "failed" && error ? (
        <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {state === "working" ? (
        <p className="mt-4 text-sm text-slate-500">
          Parsing, mapping and generating. Nothing is stored until the statements are produced.
        </p>
      ) : null}

      {result ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
          <ul className="space-y-1.5">
            {stages.map((stage) => (
              <li key={stage.text} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden
                  className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    stage.ok ? "bg-emerald-600" : "bg-rose-600"
                  }`}
                >
                  {stage.ok ? "✓" : "!"}
                </span>
                <span className={stage.ok ? "text-slate-700" : "text-rose-700"}>{stage.text}</span>
              </li>
            ))}
          </ul>
          {result.persisted ? (
            <a
              href={`/financial-statement-generator/${result.statementPackage.id}`}
              className="mt-4 inline-block rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Open {result.statementPackage.periodLabel}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  // The statements are shown on this page rather than behind a link, so a
  // deployment that stores nothing still gets the full workspace.
  return (
    <div className="space-y-6">
      {panel}
      {result ? (
        <PackageWorkspace key={result.statementPackage.id} initial={result} sourceFile={sourceFile} />
      ) : null}
    </div>
  );
}
