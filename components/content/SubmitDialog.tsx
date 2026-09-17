"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { ErrorNotice, buttonPrimary, buttonSecondary } from "./ui";

/**
 * Confirmation before handing a version to compliance.
 *
 * The sentence about locking is not a nicety — it is what actually happens, and
 * an author who does not expect it will be surprised to find the editor
 * read-only. Saying so here is cheaper than explaining it afterwards.
 *
 * A refusal comes back as a list of things to complete, shown together rather
 * than one at a time, so the author can fix them in one pass.
 */
export default function SubmitDialog({
  onCancel,
  onConfirm,
  onDone,
}: {
  onCancel: () => void;
  onConfirm: () => Promise<{ ok: boolean; error?: string; details?: string[] }>;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, submitting]);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    setDetails([]);
    const result = await onConfirm();
    if (result.ok) {
      onDone();
      return;
    }
    setError(result.error ?? "Could not submit the article.");
    setDetails(result.details ?? []);
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-heading"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 id="submit-heading" className="text-lg font-semibold text-slate-900">
          Submit for Compliance Review?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Once submitted, this version will be locked while Compliance reviews
          it. You will be able to edit again as soon as they respond, and your
          changes will become a new version.
        </p>

        {error && (
          <div className="mt-4">
            <ErrorNotice>
              {error}
              {details.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </ErrorNotice>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className={buttonSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={submitting}
            className={buttonPrimary}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? "Submitting…" : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
