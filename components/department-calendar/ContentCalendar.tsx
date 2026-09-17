"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  List,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";
import {
  CALENDAR_STATUSES,
  CONTENT_TYPE_LABELS,
  STATUS_META,
  type CalendarStatus,
} from "@/lib/content-calendar/workflow";
import {
  buildMonthGrid,
  describeSchedule,
  formatDayLabel,
  monthGridRange,
  monthLabel,
  shiftMonth,
  todayIso,
} from "@/lib/content-calendar/dates";
import type { CalendarItem } from "@/lib/content-calendar/types";
import MonthGrid from "@/components/department-calendar/MonthGrid";
import ItemComposer from "@/components/department-calendar/ItemComposer";
import ItemDetail from "@/components/department-calendar/ItemDetail";
import StatusPill from "@/components/department-calendar/StatusPill";
import { useActorName } from "@/components/department-calendar/useActorName";
import { fetchItems, updateItem } from "@/components/department-calendar/client";

/**
 * The department content calendar.
 *
 * The month grid is the map — what is going out, when, and how far along it
 * is — and the panel beside it is the workspace for one piece: its files, its
 * reference links, and the record of every approval and review it has been
 * through. The list view is the same data for people who plan by deadline
 * rather than by date.
 */
export default function ContentCalendar({
  departmentSlug,
  departmentName,
}: {
  departmentSlug: string;
  departmentName: string;
}) {
  const today = useMemo(() => todayIso(), []);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [view, setView] = useState<"month" | "list">("month");
  const [statusFilter, setStatusFilter] = useState<CalendarStatus | "">("");
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composer, setComposer] = useState<
    { mode: "create"; date?: string } | { mode: "edit"; item: CalendarItem } | null
  >(null);
  // Bumped after an edit so the detail panel remounts and re-reads the item
  // it is showing; without it an edit would only update the grid behind it.
  const [detailNonce, setDetailNonce] = useState(0);

  const { actorName, setActorName, ready } = useActorName();

  const range = useMemo(
    () => monthGridRange(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const { items: loaded } = await fetchItems(
          departmentSlug,
          { from: range.from, to: range.to },
          signal
        );
        setItems(loaded);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [departmentSlug, range.from, range.to]
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const visible = useMemo(
    () => (statusFilter ? items.filter((i) => i.status === statusFilter) : items),
    [items, statusFilter]
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of visible) {
      const bucket = map.get(item.scheduledOn);
      if (bucket) bucket.push(item);
      else map.set(item.scheduledOn, [item]);
    }
    return map;
  }, [visible]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, today),
    [cursor.year, cursor.month, today]
  );

  /** Replace one item in place — cheaper and steadier than a full reload. */
  const mergeItem = useCallback((item: CalendarItem) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === item.id);
      if (index === -1) return [...prev, item];
      const next = [...prev];
      next[index] = item;
      return next;
    });
  }, []);

  const moveItem = useCallback(
    async (id: string, date: string) => {
      const current = items.find((i) => i.id === id);
      if (!current || current.scheduledOn === date) return;

      // Optimistic: the card lands where it was dropped, and goes back if the
      // server refuses.
      mergeItem({ ...current, scheduledOn: date });
      try {
        const { item } = await updateItem(
          departmentSlug,
          id,
          { scheduledOn: date },
          actorName
        );
        mergeItem(item);
      } catch (err) {
        mergeItem(current);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [actorName, departmentSlug, items, mergeItem]
  );

  return (
    <div className="flex flex-col gap-4">
      {ready && !actorName && <NamePrompt onSave={setActorName} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
            aria-label="Previous month"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="min-w-[168px] text-center text-[15px] font-semibold tracking-tight text-slate-900">
            {monthLabel(cursor.year, cursor.month)}
          </h3>
          <button
            type="button"
            onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
            aria-label="Next month"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              setCursor({ year: now.getFullYear(), month: now.getMonth() });
            }}
            className="ml-1 rounded-lg border border-[var(--hairline-strong)] px-2.5 py-1 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Today
          </button>
          {isLoading && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-slate-300" />}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CalendarStatus | "")}
            aria-label="Filter by stage"
            className="rounded-lg border border-[var(--hairline-strong)] bg-white px-2.5 py-1.5 text-[12px] text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            <option value="">All stages</option>
            {CALENDAR_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
            <ViewButton
              active={view === "month"}
              onClick={() => setView("month")}
              icon={CalendarDays}
              label="Month"
            />
            <ViewButton
              active={view === "list"}
              onClick={() => setView("list")}
              icon={List}
              label="List"
            />
          </div>

          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh"
            className="rounded-lg border border-[var(--hairline-strong)] p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setComposer({ mode: "create" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-brand-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            Plan content
          </button>
        </div>
      </div>

      {actorName && (
        <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
          <UserRound className="h-3.5 w-3.5" />
          Acting as
          <button
            type="button"
            onClick={() => {
              const next = window.prompt("Your name, as it should appear in the history:", actorName);
              if (next !== null) setActorName(next);
            }}
            className="font-medium text-slate-600 underline decoration-dotted underline-offset-2 hover:text-slate-900"
          >
            {actorName}
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 ring-1 ring-inset ring-red-100">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div
        className={
          selectedId
            ? "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]"
            : "grid grid-cols-1 gap-4"
        }
      >
        <div className="min-w-0">
          {view === "month" ? (
            <MonthGrid
              grid={grid}
              itemsByDate={itemsByDate}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCreateOn={(date) => setComposer({ mode: "create", date })}
              onMoveItem={(id, date) => void moveItem(id, date)}
            />
          ) : (
            <ItemListView
              items={visible}
              selectedId={selectedId}
              onSelect={setSelectedId}
              isLoading={isLoading}
              departmentName={departmentName}
            />
          )}
        </div>

        {selectedId && (
          <ItemDetail
            key={`${selectedId}:${detailNonce}`}
            departmentSlug={departmentSlug}
            itemId={selectedId}
            actorName={actorName || "Someone"}
            onChanged={mergeItem}
            onDeleted={(id) => {
              setItems((prev) => prev.filter((i) => i.id !== id));
              setSelectedId(null);
            }}
            onEdit={(item) => setComposer({ mode: "edit", item })}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {composer && (
        <ItemComposer
          departmentSlug={departmentSlug}
          actorName={actorName || "Someone"}
          item={composer.mode === "edit" ? composer.item : undefined}
          defaultDate={composer.mode === "create" ? composer.date ?? today : undefined}
          onClose={() => setComposer(null)}
          onSaved={(item) => {
            mergeItem(item);
            setSelectedId(item.id);
            setDetailNonce((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ViewButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof List;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12px] font-medium transition ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/**
 * Asked once per browser. See useActorName for why the calendar needs a name
 * the session cannot give it.
 */
function NamePrompt({ onSave }: { onSave: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value);
      }}
      className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[var(--hairline)] bg-brand-soft/60 px-4 py-3"
    >
      <UserRound className="h-4 w-4 shrink-0 text-brand" />
      <p className="text-[13px] text-slate-700">
        Who are you? Your name goes on the approvals and notes you leave here.
      </p>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={60}
        placeholder="e.g. Dana"
        className="min-w-[140px] flex-1 rounded-lg border border-[var(--hairline-strong)] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-40"
      >
        Save
      </button>
    </form>
  );
}

function ItemListView({
  items,
  selectedId,
  onSelect,
  isLoading,
  departmentName,
}: {
  items: CalendarItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  departmentName: string;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const bucket = map.get(item.scheduledOn);
      if (bucket) bucket.push(item);
      else map.set(item.scheduledOn, [item]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--hairline)] bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <CalendarDays className="mx-auto h-7 w-7 text-slate-300" />
        <p className="mt-3 text-[14px] font-medium text-slate-700">
          {isLoading ? "Loading…" : "Nothing planned this month"}
        </p>
        <p className="mt-1 text-[12px] text-slate-500">
          Use “Plan content” to put the first {departmentName.toLowerCase()} piece on the
          calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {groups.map(([date, group]) => (
        <div key={date}>
          <div className="flex items-baseline gap-2 border-b border-[var(--hairline)] bg-slate-50/60 px-4 py-2">
            <span className="text-[12px] font-semibold text-slate-700">
              {formatDayLabel(date)}
            </span>
            <span className="text-[11px] text-slate-400">{describeSchedule(date)}</span>
          </div>
          <ul className="divide-y divide-[var(--hairline)]">
            {group.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    item.id === selectedId ? "bg-brand/[0.07]" : "hover:bg-slate-50/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-slate-500">
                      {CONTENT_TYPE_LABELS[item.contentType]}
                      {item.channel ? ` · ${item.channel}` : ""}
                      {item.ownerName ? ` · ${item.ownerName}` : ""}
                      {item.scheduledTime ? ` · ${item.scheduledTime}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
                    {item.attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Paperclip className="h-3 w-3" />
                        {item.attachmentCount}
                      </span>
                    )}
                    {item.linkCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Link2 className="h-3 w-3" />
                        {item.linkCount}
                      </span>
                    )}
                    <StatusPill status={item.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
