"use client";

import { Pencil, X } from "lucide-react";
import type { DocumentGroup } from "@/lib/document-intake/types";
import IntakeStatusBadge from "./IntakeStatusBadge";
import SourceBadge from "./SourceBadge";

interface Props {
  group: DocumentGroup | null;
  onClose: () => void;
  onEditType: (groupId: string) => void;
}

function describePages(group: DocumentGroup): string {
  if (group.startPage === group.endPage) return `Page ${group.startPage}`;
  return `Pages ${group.startPage}–${group.endPage}`;
}

export default function PreviewModal({ group, onClose, onEditType }: Props) {
  if (!group) return null;

  const warnings: string[] = [];
  if (group.needsReview && !group.approved) warnings.push("Marked as needs review.");
  if (group.documentName === "Unknown")
    warnings.push("Document type could not be determined.");
  if (group.averageConfidence < 60)
    warnings.push("Confidence is below 60% — please verify carefully.");
  if (
    group.extractedTextPreview.trim().length < 20 &&
    group.documentName !== "Passport"
  ) {
    warnings.push(
      "Little or no text was extracted — page may be scanned/image-only (Needs OCR Review)."
    );
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand">
              Document Preview
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
              {group.documentName}
            </h3>
            <p className="text-xs text-slate-500">
              {describePages(group)} · {group.pageNumbers.length} page
              {group.pageNumbers.length === 1 ? "" : "s"} ·{" "}
              {group.averageConfidence}% confidence
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <IntakeStatusBadge status={group.status} />
            <SourceBadge source={group.source} />
            {group.approved && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Employee confirmed
              </span>
            )}
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Document name
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{group.documentName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Document code
              </dt>
              <dd className="mt-1 font-mono text-sm text-slate-800">
                {group.documentCode ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Category
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{group.category}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Page range
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{describePages(group)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Suggested file name
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-700">
                {group.suggestedFileName}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Final file name
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-900">
                {group.finalFileName}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reason
            </p>
            <p className="mt-1 text-sm text-slate-700">{group.reason}</p>
          </div>

          {group.matchedKeywords.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Matched keywords
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {group.matchedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Review warnings
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Extracted text preview
            </p>
            <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
              {group.extractedTextPreview.trim() ||
                "(No extractable text on these pages.)"}
            </pre>
          </div>
        </div>

        <div className="flex justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={() => {
              onEditType(group.id);
              onClose();
            }}
            className="inline-flex h-9 items-center gap-1.5 justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Document Info
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
