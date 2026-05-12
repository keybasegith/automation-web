"use client";

import { useMemo, useState } from "react";
import AccountPreviewTable from "./AccountPreviewTable";
import AccountSelectionStep from "./AccountSelectionStep";
import FinanceIntelligenceLandingCard from "./FinanceIntelligenceLandingCard";
import GenerateAnalysisButton from "./GenerateAnalysisButton";
import SageUploadStep from "./SageUploadStep";
import ValidationPanel from "./ValidationPanel";
import type {
  AccountPreview,
  AccountSummary,
  SageAccount,
} from "@/lib/finance-intelligence/types";

interface ParseResponse {
  filename: string;
  parsedAt: string;
  detectedFiscalYears: number[];
  accounts: SageAccount[];
}

interface PreviewResponse {
  preview: AccountPreview;
}

function defaultAsAtDate(year: number, period: string): string {
  const p = Number(period);
  const m = Number.isFinite(p) ? Math.min(Math.max(p, 1), 12) : 12;
  // Last day of month in YYYY-MM-DD
  const last = new Date(Date.UTC(year, m, 0));
  const y = last.getUTCFullYear();
  const mm = String(last.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function latestDocDateOf(account: SageAccount): string | undefined {
  let latest: string | undefined;
  for (const t of account.transactions) {
    if (!t.docDate) continue;
    if (!latest || t.docDate > latest) latest = t.docDate;
  }
  return latest;
}

function toSummary(account: SageAccount): AccountSummary {
  return {
    accountNumber: account.accountNumber,
    accountNumberRaw: account.accountNumberRaw,
    accountName: account.accountName,
    fiscalYear: account.fiscalYear,
    transactionCount: account.transactions.length,
    openingBalance: account.openingBalance,
    endingBalance: account.endingBalance,
    latestTransactionDate: latestDocDateOf(account),
  };
}

/** Derive { fiscalYear, fiscalPeriod, asAtDate } from an ISO YYYY-MM-DD. */
function deriveTimingFromDate(iso: string): {
  fiscalYear: number;
  fiscalPeriod: string;
  asAtDate: string;
} | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  const period = String(month).padStart(2, "0");
  return {
    fiscalYear: year,
    fiscalPeriod: period,
    asAtDate: defaultAsAtDate(year, period),
  };
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; detail?: string };
    return data.error ?? data.detail ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export default function MonthlyAccountAnalysisWorkflow() {
  const [started, setStarted] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [parsed, setParsed] = useState<ParseResponse | null>(null);

  const today = new Date();
  const [fiscalYear, setFiscalYear] = useState<number>(today.getUTCFullYear());
  const [fiscalPeriod, setFiscalPeriod] = useState<string>(
    String(today.getUTCMonth() + 1).padStart(2, "0")
  );
  const [asAtDate, setAsAtDate] = useState<string>(
    defaultAsAtDate(today.getUTCFullYear(), String(today.getUTCMonth() + 1).padStart(2, "0"))
  );
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<
    string | null
  >(null);

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<AccountPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const accountSummaries = useMemo<AccountSummary[]>(
    () => (parsed ? parsed.accounts.map(toSummary) : []),
    [parsed]
  );

  const selectedAccount = useMemo<SageAccount | null>(() => {
    if (!parsed || !selectedAccountNumber) return null;
    return (
      parsed.accounts.find((a) => a.accountNumber === selectedAccountNumber) ??
      null
    );
  }, [parsed, selectedAccountNumber]);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    setParsed(null);
    setPreview(null);
    setSelectedAccountNumber(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/finance-intelligence/parse-sage-export", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await safeReadError(res));
      const data = (await res.json()) as ParseResponse;
      setParsed(data);

      // Default the timing to the latest transaction actually present in the
      // file, not to "today" — that way the generated header reads e.g.
      // "As at Mar 31, 2026" when the data ends in March.
      let latestDate: string | undefined;
      for (const a of data.accounts) {
        const d = latestDocDateOf(a);
        if (d && (!latestDate || d > latestDate)) latestDate = d;
      }
      const timing = latestDate ? deriveTimingFromDate(latestDate) : null;
      if (timing) {
        setFiscalYear(timing.fiscalYear);
        setFiscalPeriod(timing.fiscalPeriod);
        setAsAtDate(timing.asAtDate);
      } else if (data.detectedFiscalYears.length > 0) {
        const latest = data.detectedFiscalYears[data.detectedFiscalYears.length - 1];
        setFiscalYear(latest);
        setAsAtDate(defaultAsAtDate(latest, fiscalPeriod));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectionChange = (next: {
    accountNumber: string | null;
    fiscalYear: number;
    fiscalPeriod: string;
    asAtDate: string;
  }) => {
    const accountChanged = next.accountNumber !== selectedAccountNumber;
    const yearChanged = next.fiscalYear !== fiscalYear;
    const periodChanged = next.fiscalPeriod !== fiscalPeriod;
    setSelectedAccountNumber(next.accountNumber);

    // When the user picks a different account, snap the timing to that
    // account's actual latest transaction so the generated "As at" header
    // matches reality. Manual period/date tweaks afterwards win.
    if (accountChanged && next.accountNumber && parsed) {
      const picked = parsed.accounts.find(
        (a) => a.accountNumber === next.accountNumber
      );
      const latest = picked ? latestDocDateOf(picked) : undefined;
      const timing = latest ? deriveTimingFromDate(latest) : null;
      if (timing) {
        setFiscalYear(timing.fiscalYear);
        setFiscalPeriod(timing.fiscalPeriod);
        setAsAtDate(timing.asAtDate);
        return;
      }
    }

    setFiscalYear(next.fiscalYear);
    setFiscalPeriod(next.fiscalPeriod);
    if ((yearChanged || periodChanged) && next.asAtDate === asAtDate) {
      setAsAtDate(defaultAsAtDate(next.fiscalYear, next.fiscalPeriod));
    } else {
      setAsAtDate(next.asAtDate);
    }
  };

  const handleLoadPreview = async () => {
    if (!selectedAccount) return;
    setIsLoadingPreview(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/finance-intelligence/preview-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: selectedAccount,
          fiscalYear,
          fiscalPeriod,
          asAtDate,
        }),
      });
      if (!res.ok) throw new Error(await safeReadError(res));
      const data = (await res.json()) as PreviewResponse;
      setPreview(data.preview);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAccount) return;
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(
        "/api/finance-intelligence/generate-monthly-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account: selectedAccount,
            fiscalYear,
            fiscalPeriod,
            asAtDate,
          }),
        }
      );
      if (!res.ok) throw new Error(await safeReadError(res));
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename =
        match?.[1] ??
        `monthly-analysis-${selectedAccount.accountNumber}-${fiscalYear}-${fiscalPeriod}.xlsx`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  if (!started) {
    return <FinanceIntelligenceLandingCard onStart={() => setStarted(true)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <SageUploadStep
        file={file}
        onFileChange={setFile}
        onUpload={handleUpload}
        isUploading={isUploading}
        error={uploadError}
      />

      {parsed && (
        <>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600">
            Parsed <span className="font-medium text-slate-900">{parsed.filename}</span> ·{" "}
            {parsed.accounts.length} account
            {parsed.accounts.length === 1 ? "" : "s"} detected · Fiscal year(s):{" "}
            {parsed.detectedFiscalYears.length > 0
              ? parsed.detectedFiscalYears.join(", ")
              : "unknown"}
          </div>

          <AccountSelectionStep
            accounts={accountSummaries}
            detectedFiscalYears={parsed.detectedFiscalYears}
            fiscalYear={fiscalYear}
            fiscalPeriod={fiscalPeriod}
            asAtDate={asAtDate}
            selectedAccountNumber={selectedAccountNumber}
            onChange={handleSelectionChange}
            onPreview={handleLoadPreview}
            isLoadingPreview={isLoadingPreview}
          />
        </>
      )}

      {previewError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {previewError}
        </p>
      )}

      {preview && (
        <>
          <AccountPreviewTable preview={preview} />
          <ValidationPanel
            status={preview.validationStatus}
            sageEndingBalance={preview.sageEndingBalance}
            generatedEndingBalance={preview.generatedEndingBalance}
            difference={preview.difference}
          />
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <header className="mb-3">
              <h3 className="text-base font-semibold text-slate-900">
                Step 4 — Generate Monthly Analysis
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Produces an Excel workbook matching the standard monthly
                account analysis format.
              </p>
            </header>
            <GenerateAnalysisButton
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              disabled={!selectedAccountNumber}
            />
            {generateError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {generateError}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
