"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  Trash2,
  Undo2,
  User,
  X,
} from "lucide-react";
import {
  CALENDAR_STATUSES,
  CONTENT_TYPE_LABELS,
  STATUS_META,
  isSendBack,
  nextStatus,
  statusIndex,
  type CalendarStatus,
} from "@/lib/content-calendar/workflow";
import {
  ATTACHMENT_ACCEPT_ATTR,
  formatBytes,
} from "@/lib/content-calendar/attachmentPolicy";
import {
  describeSchedule,
  formatFullDate,
  formatRelativeTime,
} from "@/lib/content-calendar/dates";
import type { CalendarItem, CalendarItemDetail } from "@/lib/content-calendar/types";
import StatusPill from "@/components/department-calendar/StatusPill";
import {
  addComment,
  addLink,
  attachmentHref,
  changeStatus,
  deleteAttachment,
  deleteItem,
  deleteLink,
  fetchItem,
  uploadAttachment,
} from "@/components/department-calendar/client";

/**
 * Everything about one planned piece: where it is in the pipeline, the files
 * and references gathered for it, and the record of who moved it and why.
 */
export default function ItemDetail({
  departmentSlug,
  itemId,
  actorName,
  onChanged,
  onDeleted,
  onEdit,
  onClose,
}: {
  departmentSlug: string;
  itemId: string;
  actorName: string;
  onChanged: (item: CalendarItem) => void;
  onDeleted: (id: string) => void;
  onEdit: (item: CalendarItem) => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<CalendarItemDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const { item } = await fetchItem(departmentSlug, itemId, signal);
        setDetail(item);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [departmentSlug, itemId]
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Every mutation ends the same way: re-read the item, tell the parent. */
  const run = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setBusy(label);
      setError(null);
      try {
        await action();
        const { item } = await fetchItem(departmentSlug, itemId);
        setDetail(item);
        onChanged(item);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [departmentSlug, itemId, onChanged]
  );

  if (isLoading && !detail) {
    return (
      <Shell onClose={onClose}>
        <div className="flex items-center gap-2 px-5 py-16 text-[13px] text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </Shell>
    );
  }

  if (!detail) {
    return (
      <Shell onClose={onClose}>
        <p className="px-5 py-16 text-center text-[13px] text-slate-500">
          {error ?? "That item could not be loaded."}
        </p>
      </Shell>
    );
  }

  const forward = nextStatus(detail.status);

  return (
    <Shell onClose={onClose}>
      <div className="flex flex-col gap-5 px-5 py-5">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <StatusPill status={detail.status} />
                <span className="text-[11px] text-slate-400">
                  {CONTENT_TYPE_LABELS[detail.contentType]}
                  {detail.channel ? ` · ${detail.channel}` : ""}
                </span>
              </div>
              <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-slate-900">
                {detail.title}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <IconButton label="Edit" onClick={() => onEdit(detail)}>
                <Pencil className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                label="Delete"
                danger
                onClick={() => {
                  if (!window.confirm(`Delete "${detail.title}"? This cannot be undone.`)) {
                    return;
                  }
                  // Not through `run`: there is nothing left to re-read
                  // afterwards, and this panel is about to unmount.
                  setBusy("delete");
                  setError(null);
                  deleteItem(departmentSlug, detail.id)
                    .then(() => onDeleted(detail.id))
                    .catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : String(err));
                      setBusy(null);
                    });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>

          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
            <div className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              <dd>
                {formatFullDate(detail.scheduledOn)}
                {detail.scheduledTime ? ` · ${detail.scheduledTime}` : ""}
                <span className="ml-1.5 text-slate-400">
                  ({describeSchedule(detail.scheduledOn)})
                </span>
              </dd>
            </div>
            {detail.ownerName && (
              <div className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <dd>{detail.ownerName}</dd>
              </div>
            )}
          </dl>

          {detail.summary && (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
              {detail.summary}
            </p>
          )}
        </header>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 ring-1 ring-inset ring-red-100">
            {error}
          </p>
        )}

        <StageControls
          status={detail.status}
          forward={forward}
          busy={busy}
          onMove={(to, note) =>
            run(`status:${to}`, async () => {
              await changeStatus(departmentSlug, detail.id, to, note, actorName);
            })
          }
        />

        <AttachmentSection
          departmentSlug={departmentSlug}
          detail={detail}
          actorName={actorName}
          busy={busy}
          onUpload={(files) =>
            run("upload", async () => {
              for (const file of files) {
                await uploadAttachment(departmentSlug, detail.id, file, actorName);
              }
            })
          }
          onRemove={(attachmentId) =>
            run(`attachment:${attachmentId}`, async () => {
              await deleteAttachment(departmentSlug, detail.id, attachmentId, actorName);
            })
          }
        />

        <LinkSection
          detail={detail}
          busy={busy}
          onAdd={(url) =>
            run("link", async () => {
              await addLink(departmentSlug, detail.id, url, actorName);
            })
          }
          onRemove={(linkId) =>
            run(`link:${linkId}`, async () => {
              await deleteLink(departmentSlug, detail.id, linkId, actorName);
            })
          }
        />

        <HistorySection
          detail={detail}
          busy={busy}
          onComment={(note) =>
            run("comment", async () => {
              await addComment(departmentSlug, detail.id, note, actorName);
            })
          }
        />
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <aside className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close details"
        className="absolute right-3 top-3 z-10 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="max-h-[calc(100vh-11rem)] overflow-y-auto">{children}</div>
    </aside>
  );
}

function IconButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 ${
        danger ? "hover:text-red-600" : "hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof Paperclip;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--hairline)] pt-4">
      <h4 className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-500">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {title}
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-medium text-slate-500">
            {count}
          </span>
        )}
      </h4>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stage controls
// ---------------------------------------------------------------------------

function StageControls({
  status,
  forward,
  busy,
  onMove,
}: {
  status: CalendarStatus;
  forward: CalendarStatus | null;
  busy: string | null;
  onMove: (to: CalendarStatus, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [sendBackTo, setSendBackTo] = useState<CalendarStatus | "">("");
  const earlier = CALENDAR_STATUSES.filter((s) => statusIndex(s) < statusIndex(status));
  const moving = busy?.startsWith("status:") ?? false;

  return (
    <Section title="Stage" icon={Check}>
      <p className="mb-2.5 text-[12px] text-slate-500">{STATUS_META[status].hint}</p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Note for the history — required when sending something back."
        className="mb-2 w-full resize-y rounded-lg border border-[var(--hairline-strong)] bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
      />

      <div className="flex flex-wrap items-center gap-2">
        {forward ? (
          <button
            type="button"
            disabled={moving}
            onClick={() => {
              onMove(forward, note);
              setNote("");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
          >
            {moving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
            {STATUS_META[forward].advanceLabel}
          </button>
        ) : (
          <span className="text-[12px] text-slate-400">
            This is the end of the pipeline.
          </span>
        )}

        {earlier.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={sendBackTo}
              onChange={(e) => setSendBackTo(e.target.value as CalendarStatus | "")}
              aria-label="Send back to"
              className="rounded-lg border border-[var(--hairline-strong)] bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Send back to…</option>
              {earlier.map((value) => (
                <option key={value} value={value}>
                  {STATUS_META[value].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!sendBackTo || moving}
              onClick={() => {
                if (!sendBackTo) return;
                onMove(sendBackTo, note);
                setNote("");
                setSendBackTo("");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hairline-strong)] px-2.5 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Send back
            </button>
          </div>
        )}
      </div>

      {sendBackTo && isSendBack(status, sendBackTo) && !note.trim() && (
        <p className="mt-2 text-[12px] text-amber-700">
          Add a note saying what has to change before sending it back.
        </p>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

function AttachmentSection({
  departmentSlug,
  detail,
  busy,
  onUpload,
  onRemove,
}: {
  departmentSlug: string;
  detail: CalendarItemDetail;
  actorName: string;
  busy: string | null;
  onUpload: (files: File[]) => void;
  onRemove: (attachmentId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const uploading = busy === "upload";

  return (
    <Section title="Files" icon={Paperclip} count={detail.attachments.length}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length > 0) onUpload(files);
        }}
        className={`mb-2.5 flex items-center justify-between gap-3 rounded-xl border border-dashed px-3.5 py-3 transition ${
          isDragging
            ? "border-brand bg-brand-soft"
            : "border-[var(--hairline-strong)] bg-slate-50/50"
        }`}
      >
        <p className="text-[12px] text-slate-500">
          {uploading ? "Uploading…" : "Drop files here, or"}
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hairline-strong)] bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onUpload(files);
            e.target.value = "";
          }}
        />
      </div>

      {detail.attachments.length === 0 ? (
        <p className="text-[12px] text-slate-400">
          Briefs, drafts, artwork — anything the next person needs.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {detail.attachments.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--hairline)] px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-slate-800">
                  {file.fileName}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatBytes(file.sizeBytes)} · {file.uploadedByName || "Someone"} ·{" "}
                  {formatRelativeTime(file.createdAt)}
                </p>
              </div>
              <a
                href={attachmentHref(departmentSlug, detail.id, file.id)}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title={`Download ${file.fileName}`}
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                disabled={busy === `attachment:${file.id}`}
                onClick={() => {
                  if (window.confirm(`Remove "${file.fileName}"?`)) onRemove(file.id);
                }}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-40"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

function LinkSection({
  detail,
  busy,
  onAdd,
  onRemove,
}: {
  detail: CalendarItemDetail;
  busy: string | null;
  onAdd: (url: string) => void;
  onRemove: (linkId: string) => void;
}) {
  const [url, setUrl] = useState("");
  const adding = busy === "link";

  return (
    <Section title="Links" icon={Link2} count={detail.links.length}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim() || adding) return;
          onAdd(url.trim());
          setUrl("");
        }}
        className="mb-2.5 flex items-center gap-2"
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a reference or published link"
          className="min-w-0 flex-1 rounded-lg border border-[var(--hairline-strong)] bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={adding || !url.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--hairline-strong)] bg-white px-2.5 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
          Add
        </button>
      </form>

      {detail.links.length === 0 ? (
        <p className="text-[12px] text-slate-400">
          Research, the live post, a competitor&apos;s piece — the preview is saved with it.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {detail.links.map((link) => (
            <li
              key={link.id}
              className="group/link flex gap-3 rounded-xl border border-[var(--hairline)] p-2.5 transition hover:border-[var(--hairline-strong)]"
            >
              {link.imageUrl && (
                // Remote preview thumbnails from arbitrary sites: a plain <img>
                // avoids adding every domain anyone pastes to the image config.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={link.imageUrl}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-900 hover:text-brand"
                >
                  <span className="line-clamp-1">{link.title || link.url}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-300" />
                </a>
                {link.description && (
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-slate-500">
                    {link.description}
                  </p>
                )}
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {link.siteName || new URL(link.url).hostname} ·{" "}
                  {link.addedByName || "Someone"}
                </p>
              </div>
              <button
                type="button"
                disabled={busy === `link:${link.id}`}
                onClick={() => onRemove(link.id)}
                className="h-fit rounded-md p-1.5 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-red-600 focus:opacity-100 disabled:opacity-40 group-hover/link:opacity-100"
                title="Remove link"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

const EVENT_VERB: Record<string, string> = {
  created: "planned this",
  updated: "edited the details",
  comment: "commented",
  attachment_added: "attached",
  attachment_removed: "removed",
  link_added: "added a link",
  link_removed: "removed a link",
};

function HistorySection({
  detail,
  busy,
  onComment,
}: {
  detail: CalendarItemDetail;
  busy: string | null;
  onComment: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const commenting = busy === "comment";

  return (
    <Section title="Activity" icon={MessageSquare}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim() || commenting) return;
          onComment(note.trim());
          setNote("");
        }}
        className="mb-3 flex items-center gap-2"
      >
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          placeholder="Leave a note for the team"
          className="min-w-0 flex-1 rounded-lg border border-[var(--hairline-strong)] bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={commenting || !note.trim()}
          className="shrink-0 rounded-lg border border-[var(--hairline-strong)] bg-white px-2.5 py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          {commenting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
        </button>
      </form>

      <ol className="flex flex-col gap-2.5">
        {detail.events.map((event) => (
          <li key={event.id} className="flex gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-slate-600">
                <span className="font-medium text-slate-800">
                  {event.actorName || "Someone"}
                </span>{" "}
                {event.kind === "status_changed" && event.toStatus ? (
                  <>
                    moved this to{" "}
                    <span className="font-medium text-slate-800">
                      {STATUS_META[event.toStatus].label}
                    </span>
                    {event.fromStatus && (
                      <span className="text-slate-400">
                        {" "}
                        from {STATUS_META[event.fromStatus].label}
                      </span>
                    )}
                  </>
                ) : (
                  EVENT_VERB[event.kind] ?? event.kind
                )}
                <span className="ml-1.5 text-[11px] text-slate-400">
                  {formatRelativeTime(event.createdAt)}
                </span>
              </p>
              {event.note && (
                <p className="mt-0.5 whitespace-pre-wrap rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-slate-600">
                  {event.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
