/**
 * The opening screen.
 *
 * Deliberately plain: a heading, one line of orientation, and the standing
 * boundaries of the current phase. No suggested prompts that the mock provider
 * could not answer, and no capability the feature does not have.
 */

import { Bot } from "lucide-react";

const BOUNDARIES = [
  "Runs inside company infrastructure — nothing is sent to an outside AI service.",
  "Attach images and documents by dropping them here, pasting, or using the paperclip.",
  "Files are not stored, and no model can read them until one is connected.",
];

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"
      >
        <Bot className="h-6 w-6" />
      </div>
      <h3 className="font-display text-[22px] font-semibold tracking-tight text-slate-900">
        How can I help?
      </h3>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-slate-500">
        Ask general questions using our private internal AI environment.
      </p>
      <ul className="mt-6 flex max-w-md flex-col gap-1.5 text-[12px] leading-relaxed text-slate-400">
        {BOUNDARIES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
