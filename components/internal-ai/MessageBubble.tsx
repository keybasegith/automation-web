/**
 * One turn in the transcript.
 *
 * User turns sit right in a filled bubble; assistant turns run full width in
 * plain type, which keeps long answers readable. Content is rendered as text —
 * never as HTML — so nothing a model returns can execute in the page.
 */

import { Bot } from "lucide-react";

import { AttachmentChips } from "@/components/internal-ai/AttachmentChips";
import type { ChatMessage } from "@/lib/internal-ai/types";

function Timestamp({ iso }: { iso: string }) {
  const date = new Date(iso);
  const label = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (!label) return null;
  return (
    <time dateTime={iso} className="text-[11px] text-slate-400">
      {label}
    </time>
  );
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const attachments = (message.attachments ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    sizeBytes: file.sizeBytes,
    previewUrl: file.previewUrl,
  }));

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1 sm:max-w-[70%]">
          <div className="flex flex-col gap-2.5 rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[14px] leading-relaxed text-white">
            {attachments.length > 0 ? (
              <AttachmentChips files={attachments} tone="onBrand" />
            ) : null}
            {message.content ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : null}
          </div>
          <Timestamp iso={message.createdAt} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
      >
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-slate-800">
          {message.content}
        </p>
        <div className="flex items-center gap-2">
          <Timestamp iso={message.createdAt} />
          {message.model ? (
            <span className="text-[11px] text-slate-400">· {message.model}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The assistant's placeholder while a response is being generated. */
export function PendingBubble() {
  return (
    <div className="flex gap-3" aria-live="polite">
      <div
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
      >
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        <span className="sr-only">Generating a response</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
