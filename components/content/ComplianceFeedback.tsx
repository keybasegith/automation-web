import { MessageSquareWarning } from "lucide-react";
import type { ContentReview } from "@/lib/content/types";

/**
 * The feedback an author still has to act on.
 *
 * Printed in full at the top of the editor rather than tucked behind a tab.
 * The whole reason a piece came back is in this box, and an author should not
 * have to go looking for it.
 */
export default function ComplianceFeedback({ review }: { review: ContentReview }) {
  const rejected = review.decision === "rejected";

  return (
    <section
      aria-labelledby="compliance-feedback"
      className={`rounded-2xl border px-5 py-4 ${
        rejected
          ? "border-rose-200 bg-rose-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <h2
        id="compliance-feedback"
        className={`flex items-center gap-2 text-sm font-semibold ${
          rejected ? "text-rose-800" : "text-amber-900"
        }`}
      >
        <MessageSquareWarning className="h-4 w-4" />
        {rejected ? "Compliance rejected this article" : "Compliance feedback"}
      </h2>
      {review.comment ? (
        <p
          className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${
            rejected ? "text-rose-800" : "text-amber-900"
          }`}
        >
          {review.comment}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-slate-500">
          No written comment was left. Ask compliance directly before resubmitting.
        </p>
      )}
    </section>
  );
}
