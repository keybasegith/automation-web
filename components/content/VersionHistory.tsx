"use client";

import Link from "next/link";
import type { ContentReview, ContentRevision, RevisionState } from "@/lib/content/types";
import { WhenLabel } from "./ui";

/**
 * The article's revision trail.
 *
 * Every revision is listed with the decision recorded against it, because that
 * pairing is the point of the whole design: approval belongs to a revision id,
 * so "v2 — Approved by Christine" is a fact about v2 and says nothing at all
 * about v3. The live version is marked so it is obvious which one the public is
 * actually reading, even when a newer draft exists above it.
 */

const STATE_LABELS: Record<RevisionState, string> = {
  draft: "Draft",
  submitted: "Submitted",
  changes_requested: "Changes Requested",
  approved: "Approved",
  rejected: "Rejected",
  superseded: "Superseded",
};

const STATE_STYLES: Record<RevisionState, string> = {
  draft: "text-slate-500",
  submitted: "text-amber-700",
  changes_requested: "text-rose-700",
  approved: "text-[#006d6e]",
  rejected: "text-rose-700",
  superseded: "text-slate-400",
};

export default function VersionHistory({
  revisions,
  reviews,
  articleId,
  publishedRevisionId,
}: {
  revisions: ContentRevision[];
  reviews: ContentReview[];
  articleId: string;
  publishedRevisionId: string | null;
}) {
  if (revisions.length === 0) {
    return <p className="text-sm text-slate-400">No versions yet.</p>;
  }

  // The decision recorded against each revision, if any.
  const decisionFor = new Map<string, ContentReview>();
  for (const review of [...reviews].reverse()) {
    decisionFor.set(review.revisionId, review);
  }

  return (
    <ol className="space-y-3">
      {revisions.map((revision) => {
        const decision = decisionFor.get(revision.id);
        const live = revision.id === publishedRevisionId;
        return (
          <li
            key={revision.id}
            className="border-l-2 border-slate-200 pl-3 first:border-[#006d6e]"
          >
            <div className="flex items-baseline justify-between gap-2">
              <Link
                href={`/content/articles/${articleId}/preview?revision=${revision.id}`}
                target="_blank"
                className="font-mono text-sm font-semibold text-slate-800 hover:text-[#006d6e] hover:underline"
              >
                v{revision.revisionNumber}
              </Link>
              <span className={`text-xs font-medium ${STATE_STYLES[revision.state]}`}>
                {STATE_LABELS[revision.state]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              <WhenLabel iso={revision.createdAt} withTime />
            </p>
            {live && (
              <p className="mt-0.5 text-xs font-medium text-emerald-700">
                Live on the website
              </p>
            )}
            {decision?.comment && (
              <p className="mt-1 line-clamp-2 text-xs italic text-slate-500">
                “{decision.comment}”
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
