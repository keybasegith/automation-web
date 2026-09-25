"use client";

/**
 * The documents the NAAF and CRQ require alongside the forms: ID, the tax
 * residence declaration, a PEP/HIO declaration, a void cheque, POA papers,
 * the corporate resolution — whichever apply to this application. Each is
 * uploaded (filed on the client's record) or confirmed as already on file.
 */

import { useRef, useState } from "react";
import { CheckCircle2, ExternalLink, FileCheck2, Loader2, Upload, Undo2 } from "lucide-react";

import {
  requirementsFor,
  supportingFieldId,
  type Requirement,
  type RequirementId,
  type SupportingState,
  type SupportingStatus,
} from "@/lib/client-onboarding/supporting";
import type { NaafState } from "@/lib/naaf/types";

export default function DocumentsStep({
  naaf,
  supporting,
  onChange,
  onboardingId,
  canUpload,
  uploadNote,
  showFindings,
}: {
  naaf: NaafState;
  supporting: SupportingState;
  onChange: (id: RequirementId, status: SupportingStatus | null) => void;
  /** Uploads are filed against the saved onboarding, so need one. */
  onboardingId: string | null;
  canUpload: boolean;
  /** Why uploads are off, when they are. */
  uploadNote?: string;
  showFindings: boolean;
}) {
  const requirements = requirementsFor(naaf);
  const done = requirements.filter((r) => supporting[r.id]).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] leading-relaxed text-slate-600">
        What the NAAF and CRQ say must accompany them, for this application. Upload a copy to file it on the client&apos;s
        record, or confirm you already hold the original.{" "}
        <span className="font-medium text-slate-800">
          {done} of {requirements.length} provided.
        </span>
      </p>
      {!canUpload && (
        <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900">
          {uploadNote ??
            "Uploads are filed on the saved onboarding, which isn't available right now. You can still confirm documents are on file."}
        </p>
      )}
      {requirements.map((req) => (
        <RequirementCard
          key={req.id}
          requirement={req}
          status={supporting[req.id] ?? null}
          onChange={(status) => onChange(req.id, status)}
          onboardingId={onboardingId}
          canUpload={canUpload}
          flagged={showFindings && !supporting[req.id]}
        />
      ))}
    </div>
  );
}

function RequirementCard({
  requirement,
  status,
  onChange,
  onboardingId,
  canUpload,
  flagged,
}: {
  requirement: Requirement;
  status: SupportingStatus | null;
  onChange: (status: SupportingStatus | null) => void;
  onboardingId: string | null;
  canUpload: boolean;
  flagged: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (!onboardingId) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("requirement", requirement.id);
      const res = await fetch(`/api/client-onboarding/${onboardingId}/attachments`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status}).`);
      onChange(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <section
      id={supportingFieldId(requirement.id)}
      className={`scroll-mt-32 rounded-[10px] border bg-white p-4 @xl:p-5 ${
        status ? "border-emerald-200" : flagged ? "border-red-300" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-start @2xl:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            {status && <CheckCircle2 aria-hidden className="h-4.5 w-4.5 text-emerald-600" />}
            {requirement.title}
          </h3>
          <p className="mt-1 text-[13px] leading-snug text-slate-500">{requirement.why}</p>
          {status?.status === "uploaded" && (
            <a
              href={`/api/client-documents/${status.documentId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#0B6165] hover:underline"
            >
              <FileCheck2 aria-hidden className="h-4 w-4" /> {status.fileName}
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          )}
          {status?.status === "on_file" && (
            <p className="mt-2 text-[13px] font-medium text-emerald-700">Original confirmed on file</p>
          )}
          {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
          {flagged && !error && <p className="mt-2 text-[12.5px] text-red-600">Upload a copy or confirm it is on file.</p>}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {status ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <Undo2 aria-hidden className="h-3.5 w-3.5" /> Undo
            </button>
          ) : (
            <>
              <input
                ref={input}
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                aria-label={`Upload ${requirement.title}`}
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={!canUpload || !onboardingId || busy}
                title={canUpload ? undefined : "Available once the onboarding is saved"}
                className="inline-flex h-9 items-center gap-1.5 rounded-[7px] border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> : <Upload aria-hidden className="h-3.5 w-3.5" />}
                Upload
              </button>
              <button
                type="button"
                onClick={() => onChange({ status: "on_file" })}
                className="inline-flex h-9 items-center rounded-[7px] bg-[#0B6165] px-3 text-[13px] font-semibold text-white hover:bg-[#08504f]"
              >
                Original on file
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
