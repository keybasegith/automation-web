"use client";

/**
 * The composer.
 *
 * Enter sends, Shift+Enter opens a line. The textarea grows with its content
 * up to a ceiling and then scrolls, so a long prompt never pushes the
 * transcript off the screen.
 *
 * Files reach it three ways — the paperclip, a paste (screenshots included),
 * and a drop anywhere on the chat surface, which the workspace handles. A
 * message may be files alone, with no text.
 */

import { useCallback, useEffect, useRef } from "react";
import { AlertCircle, ArrowUp, Loader2, Paperclip } from "lucide-react";

import { AttachmentChips } from "@/components/internal-ai/AttachmentChips";
import type { PendingAttachment } from "@/components/internal-ai/useAttachments";
import { ATTACHMENT_ACCEPT_ATTR, formatBytes } from "@/lib/internal-ai/attachments";

const MAX_HEIGHT_PX = 200;

export function PromptInput({
  value,
  onChange,
  onSubmit,
  busy,
  maxLength,
  attachments,
  rejections,
  onAddFiles,
  onRemoveAttachment,
  onDismissRejections,
  totalBytes,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  maxLength: number;
  attachments: readonly PendingAttachment[];
  rejections: readonly string[];
  onAddFiles: (files: Iterable<File>) => void;
  onRemoveAttachment: (id: string) => void;
  onDismissRejections: () => void;
  totalBytes: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }, []);

  useEffect(resize, [value, resize]);

  // Return focus to the composer once a response lands.
  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !busy;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    // Leave IME composition alone: Enter there commits a candidate, not a message.
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) onSubmit();
  };

  // Screenshots and copied files paste straight into the attachment list.
  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (busy) return;
    const files = Array.from(event.clipboardData?.files ?? []);
    if (files.length === 0) return;
    event.preventDefault();
    onAddFiles(files);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
      className="rounded-2xl border border-[var(--hairline)] bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/15"
    >
      {rejections.length > 0 ? (
        <div
          role="alert"
          className="mb-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-inset ring-amber-600/20"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <ul className="flex-1 space-y-0.5">
            {rejections.map((message) => (
              <li key={message} className="text-[12px] leading-relaxed text-amber-900">
                {message}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onDismissRejections}
            className="shrink-0 rounded-lg px-1.5 py-0.5 text-[11px] font-medium text-amber-800 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mb-2 flex flex-col gap-1.5 px-1 pt-1">
          <AttachmentChips
            files={attachments.map((a) => ({
              id: a.id,
              name: a.file.name,
              sizeBytes: a.file.size,
              previewUrl: a.previewUrl,
            }))}
            onRemove={onRemoveAttachment}
            disabled={busy}
          />
          <p className="text-[11px] text-slate-400">
            {attachments.length} file{attachments.length === 1 ? "" : "s"} ·{" "}
            {formatBytes(totalBytes)}
          </p>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT_ATTR}
          disabled={busy}
          onChange={(event) => {
            onAddFiles(event.target.files ?? []);
            // Reset so re-picking the same file fires another change event.
            event.target.value = "";
          }}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Attach images or documents"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Paperclip aria-hidden="true" className="h-4 w-4" />
        </button>

        <label htmlFor="internal-ai-prompt" className="sr-only">
          Message the internal assistant
        </label>
        <textarea
          id="internal-ai-prompt"
          ref={textareaRef}
          rows={1}
          value={value}
          maxLength={maxLength}
          disabled={busy}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask a question, or attach a file…"
          className="max-h-[200px] flex-1 resize-none bg-transparent px-1 py-2 text-[14px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:text-slate-500"
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label={busy ? "Generating a response" : "Send message"}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="px-2.5 pb-1 pt-0.5 text-[11px] text-slate-400">
        Enter to send · Shift + Enter for a new line · drop or paste files to attach
      </p>
    </form>
  );
}
