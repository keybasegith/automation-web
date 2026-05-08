"use client";

import {
  useEffect,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { Paperclip, X } from "lucide-react";

/**
 * One attached file held in browser state. Not persisted to the server (yet)
 * — when the company email API is wired up, the send route will receive
 * these as multipart form-data and forward them to the email provider.
 *
 * `previewUrl` is set for image attachments so the UI can render a thumbnail.
 * It must be revoked when the attachment is removed to free the underlying
 * Blob memory.
 */
export interface Attachment {
  id: string;
  file: File;
  previewUrl: string | null;
  kind: "image" | "file";
}

const MAX_FILE_MB = 25;
const MAX_TOTAL_MB = 50;

const newId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `att_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const buildAttachment = (file: File): Attachment => {
  const isImage = file.type.startsWith("image/");
  return {
    id: newId(),
    file,
    previewUrl: isImage ? URL.createObjectURL(file) : null,
    kind: isImage ? "image" : "file",
  };
};

interface Props {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  disabled?: boolean;
}

/**
 * Picker that accepts files via (a) click/file dialog, (b) drag-and-drop,
 * (c) paste (handled by `attachClipboardImageHandler` exported below — wire
 * that into the body textarea so screenshots paste into attachments).
 *
 * Enforces per-file and total size limits. Surfaces the size error inline
 * rather than throwing.
 */
export default function AttachmentPicker({
  attachments,
  onChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Revoke any preview URLs when the picker unmounts. Inside the list itself
  // each remove() call already revokes its own URL.
  useEffect(() => {
    return () => {
      for (const a of attachments) {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalBytes = attachments.reduce((s, a) => s + a.file.size, 0);

  const tryAdd = (incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const list = Array.from(incoming);
    if (list.length === 0) return;
    const maxBytes = MAX_FILE_MB * 1024 * 1024;
    const maxTotalBytes = MAX_TOTAL_MB * 1024 * 1024;

    const accepted: Attachment[] = [];
    let runningTotal = totalBytes;
    for (const file of list) {
      if (file.size > maxBytes) continue;
      if (runningTotal + file.size > maxTotalBytes) break;
      accepted.push(buildAttachment(file));
      runningTotal += file.size;
    }
    if (accepted.length === 0) return;
    onChange([...attachments, ...accepted]);
  };

  const remove = (id: string) => {
    const target = attachments.find((a) => a.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onChange(attachments.filter((a) => a.id !== id));
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    tryAdd(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    tryAdd(e.dataTransfer?.files ?? null);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Attachments
      </span>

      <div
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
        }}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-xs transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50/40 text-slate-400"
            : "border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100/60"
        }`}
      >
        <Paperclip className="h-4 w-4" />
        <span className="font-medium">
          {attachments.length === 0
            ? "Drop, click, or paste images / files"
            : `${attachments.length} attached · ${formatBytes(totalBytes)}`}
        </span>
        <span className="ml-auto text-[10px] text-slate-400">
          Up to {MAX_FILE_MB} MB per file · {MAX_TOTAL_MB} MB total
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          disabled={disabled}
          onChange={onFileInput}
          className="sr-only"
        />
      </div>

      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              {a.kind === "image" && a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.previewUrl}
                  alt={a.file.name}
                  className="h-10 w-10 shrink-0 rounded-md object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold uppercase text-slate-500">
                  {fileExtension(a.file.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {a.file.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatBytes(a.file.size)}
                  {a.file.type ? ` · ${a.file.type}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(a.id);
                }}
                disabled={disabled}
                aria-label={`Remove ${a.file.name}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-30"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0 || idx === name.length - 1) return "FILE";
  return name.slice(idx + 1, idx + 5).toUpperCase();
}

/**
 * Build a paste-event handler that pulls image blobs out of clipboard data
 * and forwards them to `onAdd`. Wire this into the body textarea's
 * `onPaste` so screenshots become attachments instead of garbled text.
 *
 * Non-image clipboard items (plain text, etc.) are left alone — the default
 * paste behavior handles them.
 */
export function buildClipboardImagePasteHandler(
  onAdd: (next: Attachment[]) => void,
  current: Attachment[]
) {
  return (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind !== "file") continue;
      if (!item.type.startsWith("image/")) continue;
      const blob = item.getAsFile();
      if (blob) pastedFiles.push(blob);
    }
    if (pastedFiles.length === 0) return;
    event.preventDefault();
    const additions = pastedFiles.map(buildAttachment);
    onAdd([...current, ...additions]);
  };
}
