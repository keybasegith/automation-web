"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { STATUS_META } from "@/lib/content-calendar/workflow";
import { WEEKDAY_LABELS, type GridDay } from "@/lib/content-calendar/dates";
import type { CalendarItem } from "@/lib/content-calendar/types";

/**
 * The month view: six fixed weeks so the grid does not jump height between
 * months. Cards can be dragged onto another day, which is the fastest way to
 * reschedule and the one gesture people already expect from a calendar.
 */
export default function MonthGrid({
  grid,
  itemsByDate,
  selectedId,
  onSelect,
  onCreateOn,
  onMoveItem,
}: {
  grid: GridDay[];
  itemsByDate: Map<string, CalendarItem[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateOn: (date: string) => void;
  onMoveItem: (id: string, date: string) => void;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="grid grid-cols-7 border-b border-[var(--hairline)] bg-slate-50/60">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.map((day, index) => {
          const items = itemsByDate.get(day.date) ?? [];
          const isDragTarget = dragOver === day.date;
          return (
            <div
              key={day.date}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(day.date);
              }}
              onDragLeave={() => setDragOver((d) => (d === day.date ? null : d))}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(null);
                const id = event.dataTransfer.getData("text/plain");
                if (id) onMoveItem(id, day.date);
              }}
              className={`group/day relative min-h-[124px] border-b border-r border-[var(--hairline)] p-1.5 transition ${
                index % 7 === 6 ? "border-r-0" : ""
              } ${index >= 35 ? "border-b-0" : ""} ${
                day.inMonth ? "bg-white" : "bg-slate-50/40"
              } ${day.isWeekend && day.inMonth ? "bg-slate-50/30" : ""} ${
                isDragTarget ? "bg-brand-soft ring-1 ring-inset ring-brand/40" : ""
              }`}
            >
              <div className="mb-1 flex items-center justify-between px-0.5">
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] tabular-nums ${
                    day.isToday
                      ? "bg-brand font-semibold text-white"
                      : day.inMonth
                        ? "font-medium text-slate-600"
                        : "text-slate-300"
                  }`}
                >
                  {day.dayOfMonth}
                </span>
                <button
                  type="button"
                  onClick={() => onCreateOn(day.date)}
                  aria-label={`Plan content for ${day.date}`}
                  className="rounded-md p-0.5 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 focus:opacity-100 group-hover/day:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <ul className="flex flex-col gap-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", item.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => onSelect(item.id)}
                      title={item.title}
                      className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] leading-tight transition ${
                        item.id === selectedId
                          ? "bg-slate-900 text-white"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          item.id === selectedId ? "bg-white" : STATUS_META[item.status].dot
                        }`}
                      />
                      {item.scheduledTime && (
                        <span className="shrink-0 tabular-nums opacity-70">
                          {item.scheduledTime}
                        </span>
                      )}
                      <span className="truncate">{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
