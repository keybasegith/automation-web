"use client";

import { AlertTriangle, Copy } from "lucide-react";
import type { DocumentGroup } from "@/lib/document-intake/types";
import type { MissingCoreDocument } from "@/lib/document-intake/groupPages";

interface Props {
  missing: MissingCoreDocument[];
  duplicates: Record<string, DocumentGroup[]>;
}

function describeRange(group: DocumentGroup): string {
  return group.startPage === group.endPage
    ? `page ${group.startPage}`
    : `pages ${group.startPage}–${group.endPage}`;
}

export default function MissingDocumentWarnings({
  missing,
  duplicates,
}: Props) {
  const duplicateNames = Object.keys(duplicates);

  if (missing.length === 0 && duplicateNames.length === 0) return null;

  return (
    <section className="grid gap-3 lg:grid-cols-2">
      {missing.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Possible Missing Core Document
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {missing.map((m) => (
                  <li key={m.label}>{m.label} was not detected</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-amber-800">
                This does not mean the document is absent. It means the system
                could not confidently detect it. Please review the uploaded
                package manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {duplicateNames.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Copy className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Possible Duplicate or Repeated Document
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {duplicateNames.map((name) => {
                  const occurrences = duplicates[name] ?? [];
                  return (
                    <li key={name}>
                      {name} appears in{" "}
                      {occurrences.map(describeRange).join(" and ")}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-amber-800">
                If these are intentional, you can leave them. Otherwise correct
                the document type for one of the groups.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
