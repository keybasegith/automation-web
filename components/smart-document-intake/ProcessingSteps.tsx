"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export type ProcessingStepKey =
  | "reading"
  | "extracting"
  | "detecting"
  | "grouping"
  | "review";

export type ProcessingStepStatus = "pending" | "active" | "done";

export interface ProcessingStepState {
  key: ProcessingStepKey;
  label: string;
  status: ProcessingStepStatus;
  detail?: string;
}

export const DEFAULT_STEPS: ProcessingStepState[] = [
  { key: "reading", label: "Reading document", status: "pending" },
  { key: "extracting", label: "Extracting text page by page", status: "pending" },
  { key: "detecting", label: "Detecting document types", status: "pending" },
  { key: "grouping", label: "Grouping pages", status: "pending" },
  { key: "review", label: "Preparing review table", status: "pending" },
];

interface Props {
  steps: ProcessingStepState[];
}

export default function ProcessingSteps({ steps }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">
        Processing
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        The document is being analyzed locally in your browser. No content
        leaves this page.
      </p>
      <ol className="mt-5 flex flex-col gap-3">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-3">
            <span className="mt-0.5">
              {step.status === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : step.status === "active" ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
            </span>
            <div className="flex flex-col">
              <p
                className={`text-sm font-medium ${
                  step.status === "pending" ? "text-slate-500" : "text-slate-900"
                }`}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="text-xs text-slate-500">{step.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
