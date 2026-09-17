"use client";

/**
 * The Internal AI chat surface.
 *
 * Holds the whole client-side state of the feature: one conversation, its
 * turns, the files staged for the next message, and whether a request is in
 * flight. Phase 1 keeps that in React state only — nothing is written to
 * storage, and nothing survives a reload, which is the safest place for a
 * transcript to live until server-side persistence is designed with retention
 * in mind.
 *
 * Files can be dropped anywhere on this surface, pasted into the composer, or
 * picked from the paperclip; all three land in the same staging list.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, RotateCcw, SquarePen, Upload } from "lucide-react";

import { EmptyState } from "@/components/internal-ai/EmptyState";
import { MessageBubble, PendingBubble } from "@/components/internal-ai/MessageBubble";
import { PromptInput } from "@/components/internal-ai/PromptInput";
import {
  useAttachments,
  type PendingAttachment,
} from "@/components/internal-ai/useAttachments";
import { sendChatMessage } from "@/lib/internal-ai/client";
import type { AttachmentLimits } from "@/lib/internal-ai/attachments";
import type { ChatAttachment, ChatMessage } from "@/lib/internal-ai/types";

/** How close to the bottom still counts as "following the conversation". */
const STICK_THRESHOLD_PX = 80;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toChatAttachment = (attachment: PendingAttachment): ChatAttachment => ({
  id: attachment.id,
  name: attachment.file.name,
  mimeType: attachment.file.type,
  sizeBytes: attachment.file.size,
  kind: attachment.kind,
  previewUrl: attachment.previewUrl,
});

export function InternalAiWorkspace({
  maxMessageLength,
  attachmentLimits,
}: {
  maxMessageLength: number;
  attachmentLimits: AttachmentLimits;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The message a failed send would retry, so an error is recoverable. */
  const [lastFailed, setLastFailed] = useState<{
    text: string;
    files: PendingAttachment[];
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  const files = useAttachments(attachmentLimits);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  /** dragenter/dragleave fire per child element; this counts the nesting. */
  const dragDepth = useRef(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD_PX;
  };

  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // Thumbnails in the transcript outlive the composer, so their object URLs are
  // released here — when the conversation is cleared, and on unmount.
  const sentPreviews = useRef<string[]>([]);
  const releaseSentPreviews = useCallback(() => {
    for (const url of sentPreviews.current) URL.revokeObjectURL(url);
    sentPreviews.current = [];
  }, []);
  useEffect(() => releaseSentPreviews, [releaseSentPreviews]);

  const send = useCallback(
    async (text: string, attachments: PendingAttachment[]) => {
      const content = text.trim();
      if ((!content && attachments.length === 0) || busy) return;

      stickToBottom.current = true;
      setError(null);
      setLastFailed(null);
      setBusy(true);

      for (const attachment of attachments) {
        if (attachment.previewUrl) sentPreviews.current.push(attachment.previewUrl);
      }

      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: "user",
          content,
          createdAt: new Date().toISOString(),
          model: null,
          attachments: attachments.map(toChatAttachment),
        },
      ]);

      try {
        const result = await sendChatMessage({
          message: content,
          conversationId,
          files: attachments.map((a) => a.file),
        });
        setConversationId(result.conversationId);
        setMessages((current) => [
          ...current,
          {
            id: newId(),
            role: "assistant",
            content: result.message,
            createdAt: new Date().toISOString(),
            model: result.model,
          },
        ]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
        setLastFailed({ text: content, files: attachments });
      } finally {
        setBusy(false);
      }
    },
    [busy, conversationId]
  );

  const handleSubmit = () => {
    const text = draft;
    // `detach` hands over the files without revoking previews: the transcript
    // still needs them.
    const attachments = files.detach();
    setDraft("");
    void send(text, attachments);
  };

  const handleRetry = () => {
    if (!lastFailed) return;
    // Drop the user turn that failed; `send` re-adds it.
    setMessages((current) => current.slice(0, -1));
    void send(lastFailed.text, lastFailed.files);
  };

  const handleNewConversation = () => {
    releaseSentPreviews();
    files.clear();
    setMessages([]);
    setConversationId(undefined);
    setDraft("");
    setError(null);
    setLastFailed(null);
    stickToBottom.current = true;
  };

  const dragHandlers = useMemo(
    () => ({
      onDragEnter: (event: React.DragEvent) => {
        if (busy || !event.dataTransfer?.types.includes("Files")) return;
        dragDepth.current += 1;
        setDragging(true);
      },
      onDragOver: (event: React.DragEvent) => {
        if (busy || !event.dataTransfer?.types.includes("Files")) return;
        // Without this the browser navigates to the dropped file instead.
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      },
      onDragLeave: () => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      },
      onDrop: (event: React.DragEvent) => {
        dragDepth.current = 0;
        setDragging(false);
        if (busy) return;
        const dropped = Array.from(event.dataTransfer?.files ?? []);
        if (dropped.length === 0) return;
        event.preventDefault();
        files.add(dropped);
      },
    }),
    [busy, files]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" {...dragHandlers}>
      {hasMessages ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleNewConversation}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-slate-500 transition hover:bg-slate-900/[0.04] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SquarePen aria-hidden="true" className="h-3.5 w-3.5" />
            New conversation
          </button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        {hasMessages ? (
          <div
            role="log"
            aria-live="polite"
            aria-label="Conversation"
            className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-6 sm:px-6"
          >
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {busy ? <PendingBubble /> : null}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <div className="mx-auto mt-4 w-full max-w-3xl">
        {error ? (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="flex-1 text-[13px] leading-relaxed text-rose-800">{error}</p>
            {lastFailed ? (
              <button
                type="button"
                onClick={handleRetry}
                disabled={busy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-medium text-rose-800 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        <PromptInput
          value={draft}
          onChange={setDraft}
          onSubmit={handleSubmit}
          busy={busy}
          maxLength={maxMessageLength}
          attachments={files.attachments}
          rejections={files.rejections}
          onAddFiles={files.add}
          onRemoveAttachment={files.remove}
          onDismissRejections={files.dismissRejections}
          totalBytes={files.totalBytes}
        />
      </div>

      {dragging ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand/50 bg-brand-soft/80 backdrop-blur-[1px]"
        >
          <div className="flex flex-col items-center gap-2 text-brand">
            <Upload className="h-7 w-7" />
            <p className="text-[14px] font-semibold">Drop files to attach</p>
            <p className="text-[12px] text-brand/70">Images and documents</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
