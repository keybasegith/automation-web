"use client";

import { ScanLine } from "lucide-react";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Upload one combined client PDF package",
    body: "Drag and drop a single PDF that contains every onboarding document for one client.",
  },
  {
    title: "System detects each document",
    body: "NAAF, KYC, CRQ, identity documents, and supporting files are classified page by page.",
  },
  {
    title: "Employee reviews and corrects the split",
    body: "You can change any detected document type, mark a group as Other, or preview the extracted text.",
  },
  {
    title: "Employee confirms with PIN",
    body: "A simple PIN confirmation captures who reviewed the split and when, for the audit log.",
  },
  {
    title: "System generates separated PDFs and audit logs",
    body: "Each detected document is saved as its own PDF, named after the client and page range.",
  },
];

export default function EmptyState() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <ScanLine className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">
            Separate Client Document Package
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Upload a combined client PDF and the system separates it into
            individual documents for human review. The AI never approves
            anything — it only detects, classifies, and prepares.
          </p>
        </div>
      </div>
      <ol className="mt-5 grid gap-3 lg:grid-cols-5">
        {STEPS.map((step, idx) => (
          <li
            key={step.title}
            className="rounded-xl border border-slate-200 bg-slate-50/40 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              Step {idx + 1}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {step.title}
            </p>
            <p className="mt-1 text-xs text-slate-600">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
