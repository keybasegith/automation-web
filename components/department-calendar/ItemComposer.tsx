"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_LABELS,
  CALENDAR_STATUSES,
  STATUS_META,
  type CalendarStatus,
  type ContentType,
} from "@/lib/content-calendar/workflow";
import type { CalendarItem } from "@/lib/content-calendar/types";
import { createItem, updateItem, type ItemDraft } from "@/components/department-calendar/client";

/**
 * The plan / edit dialog.
 *
 * Status is only offered when planning something new — a piece already on the
 * calendar moves through the stage buttons in the detail panel, so that every
 * move is validated and leaves a trace.
 */
export default function ItemComposer({
  departmentSlug,
  actorName,
  item,
  defaultDate,
  onClose,
  onSaved,
}: {
  departmentSlug: string;
  actorName: string;
  /** Present when editing. */
  item?: CalendarItem;
  /** The clicked day, when planning something new. */
  defaultDate?: string;
  onClose: () => void;
  onSaved: (item: CalendarItem) => void;
}) {
  const isEdit = Boolean(item);
  const [title, setTitle] = useState(item?.title ?? "");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [contentType, setContentType] = useState<ContentType>(item?.contentType ?? "blog");
  const [channel, setChannel] = useState(item?.channel ?? "");
  const [scheduledOn, setScheduledOn] = useState(
    item?.scheduledOn ?? defaultDate ?? ""
  );
  const [scheduledTime, setScheduledTime] = useState(item?.scheduledTime ?? "");
  const [ownerName, setOwnerName] = useState(item?.ownerName ?? actorName);
  const [status, setStatus] = useState<CalendarStatus>(item?.status ?? "idea");
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;
    setSaving(true);
    setError(null);

    const draft: ItemDraft = {
      title: title.trim(),
      summary: summary.trim(),
      contentType,
      channel: channel.trim(),
      scheduledOn,
      scheduledTime: scheduledTime || null,
      ownerName: ownerName.trim(),
    };

    try {
      const result = item
        ? await updateItem(departmentSlug, item.id, draft, actorName)
        : await createItem(departmentSlug, { ...draft, status }, actorName);
      onSaved(result.item);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/30 p-4 backdrop-blur-[2px] sm:p-8">
      <form
        onSubmit={submit}
        className="w-full max-w-2xl rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
      >
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-4">
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
            {isEdit ? "Edit content" : "Plan content"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-col gap-4 px-5 py-5">
          <Field label="Title" htmlFor="cc-title">
            <input
              id="cc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
              placeholder="e.g. RRSP season blog — contribution room explained"
              className={inputClass}
            />
          </Field>

          <Field label="Notes" htmlFor="cc-summary" hint="Brief, angle, what still needs doing.">
            <textarea
              id="cc-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              maxLength={4000}
              className={`${inputClass} resize-y`}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="cc-type">
              <select
                id="cc-type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className={inputClass}
              >
                {CONTENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CONTENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Channel" htmlFor="cc-channel" hint="Where it goes out.">
              <input
                id="cc-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                maxLength={80}
                placeholder="LinkedIn, Website blog, Email…"
                className={inputClass}
              />
            </Field>

            <Field label="Date" htmlFor="cc-date">
              <input
                id="cc-date"
                type="date"
                value={scheduledOn}
                onChange={(e) => setScheduledOn(e.target.value)}
                required
                className={inputClass}
              />
            </Field>

            <Field label="Time" htmlFor="cc-time" hint="Optional.">
              <input
                id="cc-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Owner" htmlFor="cc-owner" hint="Who is producing it.">
              <input
                id="cc-owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                maxLength={60}
                placeholder="Name"
                className={inputClass}
              />
            </Field>

            {!isEdit && (
              <Field label="Starting stage" htmlFor="cc-status">
                <select
                  id="cc-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CalendarStatus)}
                  className={inputClass}
                >
                  {CALENDAR_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_META[value].label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 ring-1 ring-inset ring-red-100">
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--hairline)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Add to calendar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[var(--hairline-strong)] bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[12px] font-medium text-slate-700"
      >
        {label}
        {hint && <span className="ml-1.5 font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
