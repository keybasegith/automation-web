"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Inbox,
  Send,
  RefreshCw,
  PenSquare,
  Loader2,
  Mail,
  X,
  AlertCircle,
} from "lucide-react";

type MessageDirection = "inbound" | "outbound";
type MessageStatus = "draft" | "sending" | "sent" | "failed" | "received";

interface MailboxMessage {
  id: string;
  department: string;
  direction: MessageDirection;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  status: MessageStatus;
  provider: string;
  providerMessageId: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  createdBy: string | null;
  metadata: Record<string, unknown>;
}

interface Props {
  departmentSlug: string;
  departmentName: string;
  defaultFrom: string;
}

type Tab = "inbox" | "sent";

const formatRelative = (iso: string | null): string => {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatAbsolute = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function DepartmentMailbox({
  departmentSlug,
  departmentName,
  defaultFrom,
}: Props) {
  const [tab, setTab] = useState<Tab>("inbox");
  const [messages, setMessages] = useState<MailboxMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [providerName, setProviderName] = useState<string>("mock");
  const [isComposeOpen, setComposeOpen] = useState(false);

  const direction: MessageDirection = tab === "inbox" ? "inbound" : "outbound";

  const fetchMessages = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/departments/${departmentSlug}/email?direction=${direction}&limit=100`,
          { signal, cache: "no-store" }
        );
        if (!res.ok) {
          const detail = await res
            .json()
            .then((j) => (j as { error?: string }).error)
            .catch(() => null);
          throw new Error(detail ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as {
          messages: MailboxMessage[];
          provider: string;
        };
        setMessages(data.messages);
        setProviderName(data.provider);
        setSelectedId((prev) => {
          if (prev && data.messages.some((m) => m.id === prev)) return prev;
          return data.messages[0]?.id ?? null;
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [departmentSlug, direction]
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMessages(controller.signal);
    return () => controller.abort();
  }, [fetchMessages]);

  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId]
  );

  const handleSent = useCallback(
    (message: MailboxMessage) => {
      setComposeOpen(false);
      setTab("sent");
      setMessages((prev) => [message, ...prev]);
      setSelectedId(message.id);
    },
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--hairline)] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <TabButton
            active={tab === "inbox"}
            onClick={() => setTab("inbox")}
            icon={Inbox}
            label="Inbox"
          />
          <TabButton
            active={tab === "sent"}
            onClick={() => setTab("sent")}
            icon={Send}
            label="Sent"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 sm:inline">
            via {providerName}
          </span>
          <button
            type="button"
            onClick={() => void fetchMessages()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--hairline)] bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 transition hover:border-[var(--hairline-strong)] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-brand-hover"
          >
            <PenSquare className="h-3.5 w-3.5" />
            Compose
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Could not load mailbox</p>
            <p className="mt-0.5 text-[12px] text-red-600">{loadError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <MessageList
          messages={messages}
          tab={tab}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <MessageView message={selectedMessage} tab={tab} />
      </div>

      {isComposeOpen && (
        <ComposeDialog
          departmentSlug={departmentSlug}
          departmentName={departmentName}
          defaultFrom={defaultFrom}
          onClose={() => setComposeOpen(false)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Inbox;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function MessageList({
  messages,
  tab,
  isLoading,
  selectedId,
  onSelect,
}: {
  messages: MailboxMessage[];
  tab: Tab;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {messages.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Mail className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-[14px] font-medium text-slate-700">
            {isLoading
              ? "Loading…"
              : tab === "inbox"
                ? "No incoming messages"
                : "Nothing sent yet"}
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            {tab === "inbox"
              ? "New messages will appear here as they arrive."
              : "Use Compose to send the first one."}
          </p>
        </div>
      ) : (
        <ul className="max-h-[640px] divide-y divide-[var(--hairline)] overflow-y-auto">
          {messages.map((m) => {
            const isSelected = m.id === selectedId;
            const counterparty =
              m.direction === "inbound" ? m.from : m.to.join(", ");
            const stamp = m.direction === "inbound" ? m.receivedAt : m.sentAt;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelect(m.id)}
                  className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${
                    isSelected
                      ? "bg-brand/[0.07]"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-slate-900">
                      {counterparty || "—"}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                      {formatRelative(stamp ?? m.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-[13px] text-slate-700">
                    {m.subject || "(no subject)"}
                  </p>
                  <p className="truncate text-[12px] text-slate-500">
                    {m.body.slice(0, 120) || "—"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MessageView({
  message,
  tab,
}: {
  message: MailboxMessage | null;
  tab: Tab;
}) {
  if (!message) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-[var(--hairline-strong)] bg-white/60">
        <div className="text-center">
          <Mail className="mx-auto h-7 w-7 text-slate-300" />
          <p className="mt-3 text-[14px] font-medium text-slate-700">
            Select a message
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            {tab === "inbox"
              ? "Pick a message from the list to read it."
              : "Pick a sent message to view its delivery details."}
          </p>
        </div>
      </div>
    );
  }

  const stamp = message.direction === "inbound" ? message.receivedAt : message.sentAt;

  return (
    <article className="flex flex-col rounded-2xl border border-[var(--hairline)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="border-b border-[var(--hairline)] px-6 py-5">
        <h3 className="text-[18px] font-semibold tracking-tight text-slate-900">
          {message.subject || "(no subject)"}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
          <span>
            <span className="font-medium text-slate-600">From:</span>{" "}
            {message.from}
          </span>
          <span>
            <span className="font-medium text-slate-600">To:</span>{" "}
            {message.to.join(", ") || "—"}
          </span>
          {message.cc.length > 0 && (
            <span>
              <span className="font-medium text-slate-600">Cc:</span>{" "}
              {message.cc.join(", ")}
            </span>
          )}
          <span className="tabular-nums">{formatAbsolute(stamp ?? message.createdAt)}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <StatusPill status={message.status} />
          {message.providerMessageId && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              {message.providerMessageId}
            </span>
          )}
        </div>
      </header>
      <div className="whitespace-pre-wrap px-6 py-5 text-[14px] leading-relaxed text-slate-700">
        {message.body || "(empty body)"}
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: MessageStatus }) {
  const map: Record<MessageStatus, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
    sending: { label: "Sending", cls: "bg-amber-100 text-amber-700" },
    sent: { label: "Sent", cls: "bg-emerald-100 text-emerald-700" },
    failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
    received: { label: "Received", cls: "bg-sky-100 text-sky-700" },
  };
  const entry = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

function ComposeDialog({
  departmentSlug,
  departmentName,
  defaultFrom,
  onClose,
  onSent,
}: {
  departmentSlug: string;
  departmentName: string;
  defaultFrom: string;
  onClose: () => void;
  onSent: (message: MailboxMessage) => void;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/departments/${departmentSlug}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          cc: cc.trim() ? cc : undefined,
          subject,
          body,
        }),
      });
      const data = (await res.json()) as
        | { message: MailboxMessage; provider: string }
        | { error: string; detail?: string };
      if (!res.ok || "error" in data) {
        const err = data as { error: string; detail?: string };
        throw new Error(err.detail ?? err.error ?? "Send failed");
      }
      onSent(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              {departmentName}
            </p>
            <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">
              New message
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-6 py-5">
          <Field label="From">
            <input
              type="email"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-[13px] text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              required
            />
          </Field>
          <Field label="To" hint="Comma- or newline-separated">
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="someone@example.com"
              className="w-full rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-[13px] text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              required
            />
          </Field>
          <Field label="Cc" hint="Optional">
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="w-full rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-[13px] text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
          </Field>
          <Field label="Subject">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-[13px] text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              required
            />
          </Field>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full resize-y rounded-lg border border-[var(--hairline)] bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              required
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-[var(--hairline)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-brand-hover disabled:opacity-60"
            >
              {isSending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {isSending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500">
        {label}
        {hint && (
          <span className="ml-2 text-[10px] font-normal normal-case text-slate-400">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
