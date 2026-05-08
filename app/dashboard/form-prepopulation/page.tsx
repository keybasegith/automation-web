"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  KYC_TEMPLATE_URL,
  prepopulateKycFromNaaf,
  type PrepopulationResult,
} from "@/lib/forms/prepopulateKyc";

export default function FormPrepopulationPage() {
  const [naafFile, setNaafFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<PrepopulationResult | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Revoke any previously-issued blob URL when a new one is created or the
  // page unmounts — otherwise the browser keeps the bytes alive forever.
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setNaafFile(null);
    setResult(null);
    setDownloadUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileSelected = (file: File | null) => {
    setError(null);
    setResult(null);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    if (!file) {
      setNaafFile(null);
      return;
    }
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please upload a PDF file (the NAAF must be a fillable PDF, not a scan).");
      return;
    }
    setNaafFile(file);
  };

  const handlePrefill = async () => {
    if (!naafFile || working) return;
    setError(null);
    setWorking(true);
    try {
      // Fetch the blank KYC template from /public. Lives in the browser
      // alongside the uploaded NAAF — no data ever leaves the user's machine.
      const [naafBytes, kycResponse] = await Promise.all([
        naafFile.arrayBuffer(),
        fetch(KYC_TEMPLATE_URL),
      ]);
      if (!kycResponse.ok) {
        throw new Error(
          `Could not load the blank KYC template (HTTP ${kycResponse.status}). ` +
            `Make sure ${KYC_TEMPLATE_URL} exists in /public.`
        );
      }
      const kycBytes = await kycResponse.arrayBuffer();

      const r = await prepopulateKycFromNaaf(naafBytes, kycBytes);
      setResult(r);

      const blob = new Blob([r.filledPdfBytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Most likely cause: NAAF was a flattened scan (no AcroForm fields).
      if (/encrypted|password/i.test(msg)) {
        setError(
          "The NAAF appears to be password-protected. Please remove the password and try again."
        );
      } else {
        setError(msg);
      }
    } finally {
      setWorking(false);
    }
  };

  const downloadFileName = naafFile
    ? naafFile.name.replace(/\.pdf$/i, "") + "_KYC_Prefilled.pdf"
    : "KYC_Prefilled.pdf";

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/dashboard/form-processing-compliance"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
      >
        <span aria-hidden>←</span> Back to Form Processing
      </Link>

      <header className="mb-6 flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Form Pre-Population
        </h2>
        <p className="text-sm text-slate-500">
          Upload a filled NAAF and we&apos;ll automatically populate the matching
          fields on a blank KYC. Runs entirely in your browser — no client
          data is sent to any external service.
        </p>
      </header>

      <ComplianceBanner />

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <Section
        title="1. Upload filled NAAF"
        subtitle="The NAAF must be a fillable PDF (digital, with form fields preserved). Flattened scans cannot be read."
      >
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm transition hover:bg-slate-100/60">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <span className="font-medium text-slate-700">
              {naafFile ? naafFile.name : "Drop a filled NAAF PDF or click to choose"}
            </span>
            <span className="text-xs text-slate-500">
              {naafFile
                ? `${(naafFile.size / 1024).toFixed(1)} KB · click to change`
                : "PDF only"}
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrefill}
              disabled={!naafFile || working}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {working ? (
                <>
                  <Spinner /> Pre-filling KYC…
                </>
              ) : (
                "Pre-fill KYC"
              )}
            </button>
            {(naafFile || result) && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </Section>

      {result && downloadUrl && (
        <Section
          title="2. Download pre-filled KYC"
          subtitle={`${result.fieldsCopied} fields populated from the NAAF · ${result.unmappedFields.length} fields require manual entry.`}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={downloadUrl}
                download={downloadFileName}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                ↓ Download {downloadFileName}
              </a>
              <span className="text-xs text-slate-500">
                Open in Acrobat or Preview to review and add a fresh signature.
                Signatures from the NAAF are intentionally NOT carried over.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SummaryCard
                tone="emerald"
                title={`${result.fieldsCopied} of ${result.totalKycFields} KYC fields populated`}
                detail="The remaining KYC fields either had no value in the NAAF or are KYC-only (e.g. additional plan details, advisor signatures, dates of new signing)."
              />
              <SummaryCard
                tone="amber"
                title={`${result.unmappedFields.length} KYC fields need manual entry`}
                detail={
                  result.unmappedFields.length === 0
                    ? "Every KYC field had a value sourced from the NAAF."
                    : "These KYC-only fields don’t exist in the NAAF — fill them in manually after downloading."
                }
              />
            </div>

            {result.unmappedFields.length > 0 && (
              <details className="rounded-xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer text-xs font-medium text-slate-700">
                  Show unmapped KYC field names ({result.unmappedFields.length})
                </summary>
                <ul className="mt-3 grid grid-cols-1 gap-1 text-xs font-mono text-slate-600 sm:grid-cols-2">
                  {result.unmappedFields.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function ComplianceBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
        ✓
      </div>
      <p className="text-sm text-emerald-900">
        Field copy is deterministic and runs in your browser. No client data
        is sent to OpenAI or any external service. Signatures from the NAAF
        are intentionally not carried over — the new KYC must be re-signed.
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function SummaryCard({
  tone,
  title,
  detail,
}: {
  tone: "emerald" | "amber";
  title: string;
  detail: string;
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <div className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${cls}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs leading-relaxed opacity-80">{detail}</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-current"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
