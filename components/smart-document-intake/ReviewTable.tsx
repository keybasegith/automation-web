"use client";

import { Eye, Check, MoreHorizontal, Pencil } from "lucide-react";
import {
  UNSURE_DOCUMENT_NAME,
  type DocumentGroup,
} from "@/lib/document-intake/types";
import IntakeStatusBadge from "./IntakeStatusBadge";
import SourceBadge from "./SourceBadge";

interface Props {
  groups: DocumentGroup[];
  onEditType: (groupId: string) => void;
  onMarkOther: (groupId: string) => void;
  onApprove: (groupId: string) => void;
  onPreview: (groupId: string) => void;
}

function describePages(group: DocumentGroup): string {
  if (group.startPage === group.endPage) return `Page ${group.startPage}`;
  return `Pages ${group.startPage}–${group.endPage}`;
}

function confidenceColor(confidence: number, status: DocumentGroup["status"]): string {
  if (status === "Unknown") return "text-red-700";
  if (confidence >= 85) return "text-emerald-700";
  if (confidence >= 60) return "text-amber-700";
  return "text-red-700";
}

export default function ReviewTable({
  groups,
  onEditType,
  onMarkOther,
  onApprove,
  onPreview,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
            Detected Documents
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Review each detected group, correct the document type if needed,
            then approve.
          </p>
        </div>
        <span className="text-xs text-slate-500">
          {groups.length} group{groups.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-3 font-semibold">Detected Document Name</th>
              <th className="px-6 py-3 font-semibold">Code</th>
              <th className="px-6 py-3 font-semibold">Category</th>
              <th className="px-6 py-3 font-semibold">Pages</th>
              <th className="px-6 py-3 font-semibold">Confidence</th>
              <th className="px-6 py-3 font-semibold">Source</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold">Review Required</th>
              <th className="px-6 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((g) => {
              const isUnsure = g.documentName === UNSURE_DOCUMENT_NAME;
              return (
              <tr
                key={g.id}
                className={`align-top ${isUnsure ? "bg-orange-50/40" : "bg-white"}`}
              >
                <td className="max-w-xs px-6 py-4">
                  <div className="flex flex-col gap-1.5">
                    <p
                      className={`font-medium ${isUnsure ? "text-orange-900" : "text-slate-900"}`}
                    >
                      {isUnsure ? "Unsure — pick a document" : g.documentName}
                    </p>
                    {isUnsure && (
                      <p className="text-xs text-orange-800">
                        Could not confidently identify this page. Click
                        “Pick Document” or “Mark as Other”.
                      </p>
                    )}
                    {g.approved && (
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                        <Check className="h-3 w-3" /> Employee confirmed
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-slate-600">
                  {g.documentCode ?? "—"}
                </td>
                <td className="px-6 py-4 text-xs text-slate-600">
                  {g.category}
                </td>
                <td className="px-6 py-4 text-slate-700">
                  <p className="font-medium">{describePages(g)}</p>
                  <p className="text-xs text-slate-500">
                    {g.pageNumbers.length} page
                    {g.pageNumbers.length === 1 ? "" : "s"}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p
                    className={`font-semibold ${confidenceColor(g.averageConfidence, g.status)}`}
                  >
                    {g.averageConfidence}%
                  </p>
                </td>
                <td className="px-6 py-4">
                  <SourceBadge source={g.source} />
                </td>
                <td className="px-6 py-4">
                  <IntakeStatusBadge status={g.status} />
                </td>
                <td className="px-6 py-4">
                  {g.needsReview && !g.approved ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                      No
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onPreview(g.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditType(g.id)}
                      className={
                        isUnsure
                          ? "inline-flex h-8 items-center gap-1 rounded-lg bg-orange-600 px-2.5 text-xs font-semibold text-white transition hover:bg-orange-700"
                          : "inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {isUnsure ? "Pick Document" : "Edit Document Type"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkOther(g.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      Mark as Other
                    </button>
                    <button
                      type="button"
                      onClick={() => onApprove(g.id)}
                      disabled={g.approved || isUnsure}
                      title={isUnsure ? "Pick a document type first" : undefined}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand px-2.5 text-xs font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {g.approved ? "Approved" : "Approve Split"}
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
            {groups.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-8 text-center text-sm text-slate-500"
                >
                  No detected groups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
