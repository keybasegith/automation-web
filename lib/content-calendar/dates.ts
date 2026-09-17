/**
 * Calendar arithmetic, kept away from the UI so it can be tested directly.
 *
 * Everything here works in plain YYYY-MM-DD strings and UTC-constructed Dates.
 * A scheduled date is a calendar date, not an instant: if these were built with
 * the local-time constructor, someone west of UTC would see a piece planned for
 * the 1st render on the 30th of the month before.
 */

export interface GridDay {
  /** YYYY-MM-DD */
  date: string;
  /** False for the leading/trailing days that pad the grid to whole weeks. */
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  dayOfMonth: number;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const pad = (n: number): string => String(n).padStart(2, "0");

export const toIsoDate = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export const fromIsoDate = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/** Today in the viewer's own zone, as a calendar date. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const addDays = (iso: string, days: number): string => {
  const date = fromIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
};

/** Month arithmetic that does not overflow: (2026, 11) + 1 → (2027, 0). */
export function shiftMonth(
  year: number,
  month: number,
  by: number
): { year: number; month: number } {
  const total = year * 12 + month + by;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/**
 * The six-week block a month is drawn in — always 42 cells, so the grid does
 * not change height as the user pages through months.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  today = todayIso()
): GridDay[] {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const date = toIsoDate(day);
    const weekday = day.getUTCDay();
    return {
      date,
      inMonth: day.getUTCMonth() === month,
      isToday: date === today,
      isWeekend: weekday === 0 || weekday === 6,
      dayOfMonth: day.getUTCDate(),
    };
  });
}

/** The first and last date the grid shows — what the API is asked to load. */
export function monthGridRange(year: number, month: number): { from: string; to: string } {
  const grid = buildMonthGrid(year, month);
  return { from: grid[0].date, to: grid[grid.length - 1].date };
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Fri, Sep 4" — the detail panel's date line. */
export function formatDayLabel(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Sep 4, 2026" — used where the year matters. */
export function formatFullDate(iso: string): string {
  return fromIsoDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Relative wording for history entries. */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "in 3 days" / "2 days ago" / "today" for a scheduled date. */
export function describeSchedule(iso: string, today = todayIso()): string {
  const diff = Math.round(
    (fromIsoDate(iso).getTime() - fromIsoDate(today).getTime()) / 86400000
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${Math.abs(diff)} days ago`;
}
