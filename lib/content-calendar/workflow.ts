/**
 * The content pipeline — the single definition of what the stages are, which
 * moves are legal, and how each stage is labelled.
 *
 * Client-safe on purpose (no Node imports): the API validates transitions with
 * `canTransition` and the calendar UI builds its buttons from the same arrays,
 * so a stage cannot exist in one and not the other.
 */

export const CALENDAR_STATUSES = [
  "idea",
  "pending_approval",
  "approved",
  "in_production",
  "compliance_review",
  "compliance_cleared",
  "ready_to_post",
  "published",
] as const;

export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

export interface StatusMeta {
  /** Shown on the card and in the detail panel. */
  label: string;
  /** What this stage means, in the reviewer's terms. */
  hint: string;
  /** The button that moves an item INTO this stage from the one before it. */
  advanceLabel: string;
  /** Tailwind classes for the pill. Kept beside the stage so they stay in step. */
  pill: string;
  /** The dot on a month-grid card. */
  dot: string;
}

export const STATUS_META: Record<CalendarStatus, StatusMeta> = {
  idea: {
    label: "Idea",
    hint: "Captured, not yet pitched for approval.",
    advanceLabel: "Move back to idea",
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  pending_approval: {
    label: "Pending approval",
    hint: "Waiting on a manager to sign off on the idea.",
    advanceLabel: "Request approval",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    hint: "Manager signed off. Ready to be produced.",
    advanceLabel: "Approve",
    pill: "bg-lime-50 text-lime-700 ring-lime-200",
    dot: "bg-lime-500",
  },
  in_production: {
    label: "In production",
    hint: "Being written, designed, or filmed.",
    advanceLabel: "Start production",
    pill: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
  },
  compliance_review: {
    label: "Compliance review",
    hint: "With compliance. No scheduling until this clears.",
    advanceLabel: "Send to compliance",
    pill: "bg-violet-50 text-violet-700 ring-violet-200",
    dot: "bg-violet-500",
  },
  compliance_cleared: {
    label: "Compliance cleared",
    hint: "Compliance approved the copy as it stands.",
    advanceLabel: "Mark compliance cleared",
    pill: "bg-teal-50 text-teal-700 ring-teal-200",
    dot: "bg-teal-500",
  },
  ready_to_post: {
    label: "Ready to post",
    hint: "Final asset and copy are staged for the scheduled date.",
    advanceLabel: "Mark ready to post",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  published: {
    label: "Published",
    hint: "Live. Nothing left to do.",
    advanceLabel: "Mark published",
    pill: "bg-slate-900 text-white ring-slate-900",
    dot: "bg-slate-900",
  },
};

export const isCalendarStatus = (value: unknown): value is CalendarStatus =>
  typeof value === "string" && (CALENDAR_STATUSES as readonly string[]).includes(value);

export const statusIndex = (status: CalendarStatus): number =>
  CALENDAR_STATUSES.indexOf(status);

/** The next stage, or null at the end of the pipeline. */
export const nextStatus = (status: CalendarStatus): CalendarStatus | null =>
  CALENDAR_STATUSES[statusIndex(status) + 1] ?? null;

/**
 * Legal moves: forward exactly one stage, or back to any earlier stage.
 *
 * Skipping forward is refused because the stages are the control — an item
 * cannot arrive at "ready to post" without having passed through compliance.
 * Going back any distance is allowed because that is what actually happens
 * when a review sends something back to be rewritten.
 */
export function canTransition(from: CalendarStatus, to: CalendarStatus): boolean {
  if (from === to) return false;
  const a = statusIndex(from);
  const b = statusIndex(to);
  return b < a || b === a + 1;
}

/** True when the move is a step back — those require a note explaining why. */
export const isSendBack = (from: CalendarStatus, to: CalendarStatus): boolean =>
  statusIndex(to) < statusIndex(from);

export function transitionRejection(
  from: CalendarStatus,
  to: CalendarStatus,
  note: string
): string | null {
  if (from === to) return `The item is already at "${STATUS_META[to].label}".`;
  if (!canTransition(from, to)) {
    return (
      `An item at "${STATUS_META[from].label}" cannot jump to ` +
      `"${STATUS_META[to].label}". Move it forward one stage at a time.`
    );
  }
  if (isSendBack(from, to) && !note.trim()) {
    return "Sending an item back needs a note saying what has to change.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Content types
// ---------------------------------------------------------------------------

export const CONTENT_TYPES = [
  "blog",
  "social",
  "newsletter",
  "video",
  "event",
  "ad",
  "other",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog: "Blog post",
  social: "Social post",
  newsletter: "Newsletter",
  video: "Video",
  event: "Event",
  ad: "Ad / campaign",
  other: "Other",
};

export const isContentType = (value: unknown): value is ContentType =>
  typeof value === "string" && (CONTENT_TYPES as readonly string[]).includes(value);
