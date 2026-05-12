"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import AttachmentPicker, {
  buildClipboardImagePasteHandler,
  type Attachment,
} from "./AttachmentPicker";
import type { ClientContext } from "@/lib/secureEmail/clientContext";
import {
  CLIENT_SEGMENTS,
  CLIENT_STAGES,
  PURPOSE_CATEGORIES,
  PURPOSES_BY_CATEGORY,
  PURPOSE_LABELS,
  STATUS_LABELS,
  TONES,
  URGENCIES,
  type ClientSegment,
  type ClientStage,
  type DraftStatus,
  type EmailPurpose,
  type GenerateDraftResponse,
  type RegenerationMode,
  type Tone,
  type Urgency,
} from "@/lib/secureEmail/types";

interface RiskFlagPayload {
  flag: string;
  label: string;
  message: string;
}

interface DraftView {
  id: string;
  templateName: string;
  subject: string;
  /** Personalized body (placeholders substituted server-side). */
  body: string;
  /** Audit copy returned by the server — placeholders intact. */
  generatedDraft: string;
  status: DraftStatus;
  riskFlags: string[];
  createdAt: string;
  // Filled in after the advisor approves & sends.
  sentAt?: string | null;
  recipientEmail?: string | null;
  /** Display name of the PIN-resolved approver (filled after send). */
  approvedName?: string | null;
  approvedAt?: string | null;
}

interface FormState {
  emailPurpose: EmailPurpose;
  clientSegment: ClientSegment;
  clientStage: ClientStage;
  communicationGoal: string;
  tone: Tone;
  urgency: Urgency;
  notes: string;
}

interface ClientListItem {
  id: string;
  name: string;
  email: string;
}

const INITIAL_STATE: FormState = {
  emailPurpose: "general_client_check_in",
  clientSegment: "Mass affluent",
  clientStage: "Long-term client",
  communicationGoal: "",
  tone: "Professional",
  urgency: "Standard",
  notes: "",
};

type BusyAction =
  | "generate"
  | "softer"
  | "professional"
  | "status"
  | "send";

export default function SecureEmailGenerator() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [riskFlags, setRiskFlags] = useState<RiskFlagPayload[]>([]);
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [statusToast, setStatusToast] = useState<string | null>(null);
  // Attachments are held in browser state only — they will flow through to
  // the company email API once it's wired up. They are NOT sent to OpenAI.
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Client selector state. The list is fetched once on mount.
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [loadedClient, setLoadedClient] = useState<ClientContext | null>(null);
  const [clientLoading, setClientLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) return;
        const data = (await res.json()) as { clients?: ClientListItem[] };
        if (!cancelled && Array.isArray(data.clients)) {
          setClients(data.clients);
        }
      } catch {
        // Selector simply stays empty; the advisor can retry.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClientChange = (id: string) => {
    setClientId(id);
    if (!id) {
      setLoadedClient(null);
      setRecipientEmail("");
      setClientLoading(false);
    } else {
      setClientLoading(true);
    }
  };

  /**
   * Manual client creation for new-onboarding flow. Returns the upserted row
   * to the selector so it can refresh its UI; the parent appends to the
   * client list (so subsequent searches find the new client) and selects it
   * (so the existing context-loading effect populates segment/stage/email).
   */
  const createClient = async (
    name: string,
    email: string
  ): Promise<{ id: string; name: string; email: string } | { error: string }> => {
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { error: data.error ?? `Create failed (${res.status})` };
      }
      const created = {
        id: data.id as string,
        name: data.name as string,
        email: data.email as string,
      };
      setClients((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [...prev, created].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      });
      handleClientChange(created.id);
      return created;
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  };

  // When a client is selected, fetch the abstracted context. The browser is
  // allowed to display name/email, but those fields will not be sent to the
  // OpenAI request — only `clientId` plus the abstracted form state goes to
  // the generate route.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/clients/${encodeURIComponent(clientId)}/context`
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) {
            setError(data.error ?? "Failed to load client context.");
            setLoadedClient(null);
          }
          return;
        }
        const data = (await res.json()) as ClientContext;
        if (cancelled) return;
        setLoadedClient(data);
        setRecipientEmail(data.email);
        setForm((prev) => ({
          ...prev,
          clientSegment: data.segment,
          clientStage: data.stage,
        }));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setClientLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const generate = async (mode: RegenerationMode) => {
    if (!clientId || !loadedClient) {
      setError("Select a client before generating.");
      return;
    }
    if (!form.communicationGoal.trim()) {
      setError("Please describe the communication goal before generating.");
      return;
    }
    setError(null);
    setRiskFlags([]);
    setBusy(
      mode === "default"
        ? "generate"
        : mode === "softer"
          ? "softer"
          : "professional"
    );
    try {
      // CRITICAL: regeneration MUST send only the abstracted form state plus
      // the clientId. Never include `editBody`, `editSubject`, or any other
      // text that may already contain personalization. The /softer and
      // /more_professional regen modes route through the same payload.
      const res = await fetch("/api/secure-email-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          emailPurpose: form.emailPurpose,
          clientSegment: form.clientSegment,
          clientStage: form.clientStage,
          communicationGoal: form.communicationGoal,
          tone: form.tone,
          urgency: form.urgency,
          notes: form.notes,
          regenerationMode: mode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data.riskFlags)) {
          setRiskFlags(data.riskFlags as RiskFlagPayload[]);
        }
        const baseMsg = data.error ?? `Generation failed (${res.status})`;
        setError(data.detail ? `${baseMsg} — ${data.detail}` : baseMsg);
        return;
      }
      const payload = data as GenerateDraftResponse;
      setDraft({
        id: payload.draftId,
        templateName: payload.templateName,
        subject: payload.subject,
        body: payload.finalBody,
        generatedDraft: payload.generatedDraft,
        status: payload.status,
        riskFlags: payload.riskFlags,
        createdAt: new Date().toISOString(),
      });
      // Seed the editable fields with the personalized version.
      setEditSubject(payload.subject);
      setEditBody(payload.finalBody);
      setRecipientEmail(payload.recipientEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generate("default");
  };

  const updateStatus = async (status: DraftStatus) => {
    if (!draft) return;
    setBusy("status");
    try {
      const res = await fetch(
        `/api/secure-email-generator/${draft.id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Status update failed (${res.status})`);
        return;
      }
      setDraft({ ...draft, status });
      setStatusToast(`Marked as ${STATUS_LABELS[status]}.`);
      setTimeout(() => setStatusToast(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const copyDraft = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(
        `Subject: ${editSubject}\n\n${editBody}`
      );
      await updateStatus("copied");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const openPinPrompt = () => {
    if (!draft) return;
    if (!editSubject.trim()) {
      setError("Subject cannot be empty.");
      return;
    }
    if (!editBody.trim()) {
      setError("Email body cannot be empty.");
      return;
    }
    if (!recipientEmail.trim()) {
      setError("Enter the client's email address before sending.");
      return;
    }
    setError(null);
    setRiskFlags([]);
    setPinError(null);
    setPinPromptOpen(true);
  };

  // Submitted from the PIN modal. The PIN is forwarded to the server and never
  // stored in component state beyond this call.
  const sendDraftWithPin = async (pin: string): Promise<boolean> => {
    if (!draft) return false;
    setPinError(null);
    setBusy("send");
    try {
      const res = await fetch(
        `/api/secure-email-generator/${draft.id}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: editSubject.trim(),
            body: editBody,
            recipientEmail: recipientEmail.trim(),
            pin,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setPinError(data.error ?? "PIN not recognized.");
          return false;
        }
        if (Array.isArray(data.riskFlags)) {
          setRiskFlags(data.riskFlags as RiskFlagPayload[]);
        }
        setError(data.error ?? `Send failed (${res.status})`);
        setPinPromptOpen(false);
        return false;
      }
      setDraft({
        ...draft,
        status: "sent",
        subject: data.finalSubject ?? editSubject,
        body: data.finalBody ?? editBody,
        sentAt: data.sentAt,
        recipientEmail: data.recipientEmail,
        approvedName: data.approvedName ?? null,
        approvedAt: data.approvedAt ?? null,
      });
      setEditSubject(data.finalSubject ?? editSubject);
      setEditBody(data.finalBody ?? editBody);
      setPinPromptOpen(false);
      setStatusToast(
        data.approvedName
          ? `Approved by ${data.approvedName} — sent to ${data.recipientEmail}.`
          : `Sent to ${data.recipientEmail}.`
      );
      setTimeout(() => setStatusToast(null), 4000);
      return true;
    } catch (err) {
      setPinError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PrivacyBanner />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Section title="Email purpose">
            <GroupedSelectField
              label="Purpose"
              value={form.emailPurpose}
              onChange={(v) => update("emailPurpose", v as EmailPurpose)}
              groups={PURPOSE_CATEGORIES.map((category) => ({
                label: category,
                options: PURPOSES_BY_CATEGORY[category].map((p) => ({
                  value: p,
                  label: PURPOSE_LABELS[p],
                })),
              }))}
              spanFull
            />
          </Section>

          <Section title="Abstracted client context">
            <ClientSelectorField
              clients={clients}
              value={clientId}
              onChange={handleClientChange}
              onCreate={createClient}
              loadedClient={loadedClient}
              loading={clientLoading}
            />
            <SelectField
              label="Client segment"
              value={form.clientSegment}
              onChange={(v) => update("clientSegment", v as ClientSegment)}
              options={CLIENT_SEGMENTS.map((s) => ({ value: s, label: s }))}
            />
            <SelectField
              label="Client stage"
              value={form.clientStage}
              onChange={(v) => update("clientStage", v as ClientStage)}
              options={CLIENT_STAGES.map((s) => ({ value: s, label: s }))}
            />
            <SelectField
              label="Tone"
              value={form.tone}
              onChange={(v) => update("tone", v as Tone)}
              options={TONES.map((t) => ({ value: t, label: t }))}
            />
            <SelectField
              label="Urgency"
              value={form.urgency}
              onChange={(v) => update("urgency", v as Urgency)}
              options={URGENCIES.map((u) => ({ value: u, label: u }))}
            />
            <TextArea
              label="Communication goal"
              required
              value={form.communicationGoal}
              onChange={(v) => update("communicationGoal", v)}
              placeholder="e.g. Invite client to a 30-minute review of their long-term plan"
              rows={3}
              spanFull
            />
            <TextArea
              label="Optional notes"
              value={form.notes}
              onChange={(v) => update("notes", v)}
              placeholder="Anything the AI should know — keep it abstracted, no PII or amounts"
              rows={3}
              spanFull
            />
          </Section>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {riskFlags.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">
                The text above contains content that cannot be sent to the AI:
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-red-800">
                {riskFlags.map((f) => (
                  <li key={f.flag}>
                    <span className="font-semibold">{f.label}.</span> {f.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => generate("softer")}
              disabled={busy !== null || !loadedClient}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "softer" ? "Regenerating…" : "Regenerate softer"}
            </button>
            <button
              type="button"
              onClick={() => generate("more_professional")}
              disabled={busy !== null || !loadedClient}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "professional" ? "Regenerating…" : "Regenerate more professional"}
            </button>
            <button
              type="submit"
              disabled={busy !== null || !loadedClient}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {busy === "generate" ? "Generating…" : "Generate draft"}
            </button>
          </div>
        </form>

        <DraftPreview
          draft={draft}
          busy={busy !== null}
          sending={busy === "send"}
          editSubject={editSubject}
          editBody={editBody}
          recipientEmail={recipientEmail}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          onSubjectChange={setEditSubject}
          onBodyChange={setEditBody}
          onRecipientChange={setRecipientEmail}
          onCopy={copyDraft}
          onSave={() => updateStatus("reviewed")}
          onMarkReviewed={() => updateStatus("reviewed")}
          onArchive={() => updateStatus("archived")}
          onSend={openPinPrompt}
          statusToast={statusToast}
        />
      </div>

      <PinApprovalModal
        open={pinPromptOpen}
        sending={busy === "send"}
        error={pinError}
        recipientEmail={recipientEmail}
        onSubmit={sendDraftWithPin}
        onClose={() => {
          setPinPromptOpen(false);
          setPinError(null);
        }}
      />

      <AuditCard draft={draft} formState={form} />

      <p className="text-xs text-slate-500">
        This tool can use abstracted insights from Windfund exports, but should
        not send raw Windfund client data to the AI model.
      </p>
    </div>
  );
}

function PrivacyBanner() {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900"
    >
      <p className="font-semibold">Privacy reminder</p>
      <p className="mt-1">
        Do not enter personally identifiable information, account numbers,
        exact portfolio values, SIN, or confidential financial details. Inputs
        are scanned before any text is sent to the AI provider; risky content
        is blocked.
      </p>
    </div>
  );
}

interface DraftPreviewProps {
  draft: DraftView | null;
  busy: boolean;
  sending: boolean;
  editSubject: string;
  editBody: string;
  recipientEmail: string;
  attachments: Attachment[];
  onAttachmentsChange: (next: Attachment[]) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onRecipientChange: (value: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onMarkReviewed: () => void;
  onArchive: () => void;
  onSend: () => void;
  statusToast: string | null;
}

function DraftPreview({
  draft,
  busy,
  sending,
  editSubject,
  editBody,
  recipientEmail,
  attachments,
  onAttachmentsChange,
  onSubjectChange,
  onBodyChange,
  onRecipientChange,
  onCopy,
  onSave,
  onMarkReviewed,
  onArchive,
  onSend,
  statusToast,
}: DraftPreviewProps) {
  const isSent = draft?.status === "sent";
  const statusPillCls = isSent
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-amber-50 text-amber-800 ring-amber-200";

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand">
          {isSent ? "Sent email" : "Generated draft"}
        </h3>
        {draft && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusPillCls}`}
          >
            {STATUS_LABELS[draft.status]}
          </span>
        )}
      </header>

      {draft ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Subject
            </span>
            <input
              type="text"
              value={editSubject}
              disabled={isSent || busy}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Body — edit freely before sending
            </span>
            <textarea
              value={editBody}
              rows={14}
              disabled={isSent || busy}
              onChange={(e) => onBodyChange(e.target.value)}
              onPaste={buildClipboardImagePasteHandler(
                onAttachmentsChange,
                attachments
              )}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-sans text-sm leading-6 text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600"
            />
          </label>

          <AttachmentPicker
            attachments={attachments}
            onChange={onAttachmentsChange}
            disabled={isSent || busy}
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Send to
            </span>
            <input
              type="email"
              autoComplete="off"
              placeholder="client@example.com"
              value={isSent ? draft.recipientEmail ?? "" : recipientEmail}
              disabled={isSent || busy}
              onChange={(e) => onRecipientChange(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-600"
            />
            {!isSent && (
              <span className="text-[11px] text-slate-500">
                The recipient address is required to send. It is stored on the
                draft for audit purposes.
              </span>
            )}
          </label>

          {isSent && draft.sentAt && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Sent to <span className="font-medium">{draft.recipientEmail}</span>{" "}
              on {new Date(draft.sentAt).toLocaleString()}.
            </p>
          )}

          {statusToast && !isSent && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {statusToast}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onCopy}
              disabled={busy || isSent}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Copy draft
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={busy || isSent}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={onMarkReviewed}
              disabled={busy || isSent}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Mark as reviewed
            </button>
            <button
              type="button"
              onClick={onArchive}
              disabled={busy || isSent}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Archive
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={busy || isSent}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-4 text-xs font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {sending ? "Sending…" : isSent ? "Sent" : "Approve & send"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-700">No draft yet</p>
          <p className="mt-1 max-w-xs text-xs">
            Pick a purpose, fill in the abstracted context, and click
            <span className="font-medium"> Generate draft</span>.
          </p>
        </div>
      )}
    </section>
  );
}

function PinApprovalModal({
  open,
  sending,
  error,
  recipientEmail,
  onSubmit,
  onClose,
}: {
  open: boolean;
  sending: boolean;
  error: string | null;
  recipientEmail: string;
  onSubmit: (pin: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");

  if (!open) return null;

  // Wrap close so the PIN is wiped from local state — never keep it across
  // dialog open/close cycles.
  const closeAndClear = () => {
    setPin("");
    onClose();
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) return;
    const ok = await onSubmit(pin);
    if (ok) setPin("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-approval-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) closeAndClear();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h3
          id="pin-approval-title"
          className="text-base font-semibold text-slate-900"
        >
          Confirm with your PIN
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Enter your 4-8 digit approval PIN to send this email to{" "}
          <span className="font-medium text-slate-800">{recipientEmail}</span>.
          Your name will be stamped into the email signature and recorded on
          the audit row.
        </p>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-700">Approval PIN</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/[^\d]/g, "").slice(0, 8))
            }
            placeholder="••••"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-center text-lg tracking-[0.5em] text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </label>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeAndClear}
            disabled={sending}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending || !/^\d{4,8}$/.test(pin)}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-4 text-xs font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
          >
            {sending ? "Verifying…" : "Approve & send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AuditCard({
  draft,
  formState,
}: {
  draft: DraftView | null;
  formState: FormState;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-brand">
          Audit & status
        </h3>
        {draft && (
          <span className="text-xs text-slate-500">
            Created {new Date(draft.createdAt).toLocaleString()}
          </span>
        )}
      </header>

      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <AuditField
          label="Email purpose"
          value={PURPOSE_LABELS[formState.emailPurpose]}
        />
        <AuditField label="Template used" value={draft?.templateName ?? "—"} />
        <AuditField
          label="Final status"
          value={draft ? STATUS_LABELS[draft.status] : "—"}
        />
        <AuditField
          label="Risk flags triggered"
          value={
            draft && draft.riskFlags.length > 0
              ? draft.riskFlags.join(", ")
              : "None"
          }
        />
        <AuditField label="Tone" value={formState.tone} />
        <AuditField label="Urgency" value={formState.urgency} />
        <AuditField
          label="Approved by"
          value={draft?.approvedName ?? "—"}
        />
        <AuditField
          label="Approved at"
          value={
            draft?.approvedAt
              ? new Date(draft.approvedAt).toLocaleString()
              : "—"
          }
        />
      </dl>

      <p className="mt-4 text-xs text-slate-500">
        Saved audit rows include the advisor id, client id, purpose, template,
        risk flags, timestamps, and structured context. Raw advisor notes and
        any AI request payload that could contain client context are{" "}
        <span className="font-medium text-slate-700">not stored</span>.
      </p>
      <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        AI draft generated with placeholders only. Personalization applied
        after generation.
      </p>
    </section>
  );
}

function AuditField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="text-sm text-slate-900">{value}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

function ClientSelectorField({
  clients,
  value,
  onChange,
  onCreate,
  loadedClient,
  loading,
}: {
  clients: ClientListItem[];
  value: string;
  onChange: (id: string) => void;
  /**
   * Manual-entry handler for new clients during onboarding. Returns the
   * created (or upserted-by-email) row, or `null` if the create failed.
   * The error message is set by the parent via `null` + an alert path; the
   * field exposes a small inline error state for failures specific to the
   * form input.
   */
  onCreate: (
    name: string,
    email: string
  ) => Promise<{ id: string; name: string; email: string } | { error: string }>;
  loadedClient: ClientContext | null;
  loading: boolean;
}) {
  const [mode, setMode] = useState<"search" | "new">("search");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Manual-entry form state.
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Close the panel when the user clicks outside the component.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = `${c.id} ${c.name} ${c.email}`.toLowerCase();
      // Tokenize so "kim sarah" matches a row containing both, in any order.
      return q.split(/\s+/).every((token) => haystack.includes(token));
    });
  }, [clients, query]);

  // Clamp at read-time so a shrunken filtered list doesn't point past its end.
  const safeHighlight =
    filtered.length === 0
      ? 0
      : Math.min(highlight, filtered.length - 1);

  const select = (id: string) => {
    onChange(id);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[safeHighlight]) {
        e.preventDefault();
        select(filtered[safeHighlight].id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Show the selected client's name as the input value when nothing is being
  // typed; otherwise let the search query take over.
  const displayValue =
    query.length > 0 || !loadedClient ? query : loadedClient.fullName;

  const submitNewClient = async () => {
    setCreateError(null);
    if (!newName.trim()) {
      setCreateError("Client name is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setCreateError("Enter a valid email address.");
      return;
    }
    setCreating(true);
    try {
      const result = await onCreate(newName.trim(), newEmail.trim());
      if ("error" in result) {
        setCreateError(result.error);
        return;
      }
      // Successful create: clear the form and switch back to search mode so
      // the loaded-client preview is visible.
      setNewName("");
      setNewEmail("");
      setMode("search");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-700">
          Client<span className="ml-0.5 text-red-600">*</span>
        </span>
        <div
          role="tablist"
          aria-label="Client picker mode"
          className="inline-flex items-center rounded-lg bg-slate-100 p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "search"}
            onClick={() => {
              setMode("search");
              setCreateError(null);
            }}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              mode === "search"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Search
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "new"}
            onClick={() => {
              setMode("new");
              setOpen(false);
            }}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              mode === "new"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            + New
          </button>
        </div>
      </div>

      {mode === "search" ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="secure-email-client-listbox"
            aria-autocomplete="list"
            placeholder="Search by name, email, or client ID…"
            value={displayValue}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
              // Typing while a client is selected effectively starts a new
              // search — the previous selection stays loaded until the user
              // picks a new one or clears.
            }}
            onKeyDown={onKeyDown}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {(loadedClient || query) && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear client selection"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ×
            </button>
          )}
          {open && (
            <ul
              id="secure-email-client-listbox"
              role="listbox"
              className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-slate-500">
                  No matching clients.
                </li>
              ) : (
                filtered.map((c, i) => {
                  const isHighlighted = i === safeHighlight;
                  const isSelected = c.id === value;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => select(c.id)}
                        className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                          isHighlighted ? "bg-slate-100" : "bg-white"
                        } ${isSelected ? "ring-1 ring-brand/40" : ""}`}
                      >
                        <span className="font-medium text-slate-800">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {c.email}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          {c.id}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </div>
      ) : (
        // Not a <form>: this picker is rendered inside the outer generator
        // <form>, and nested forms are invalid HTML — the browser drops the
        // inner form, so a type="submit" button would submit the outer form.
        <div
          onKeyDown={(e) => {
            if (e.key === "Enter" && !creating) {
              e.preventDefault();
              void submitNewClient();
            }
          }}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
        >
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-700">
              Full name
            </span>
            <input
              type="text"
              autoComplete="off"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Sarah Kim"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-700">
              Email
            </span>
            <input
              type="email"
              autoComplete="off"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="client@example.com"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </label>
          {createError && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700"
            >
              {createError}
            </p>
          )}
          <p className="text-[10px] text-slate-500">
            Saved with default risk tolerance &ldquo;Low&rdquo; and a $0
            placeholder portfolio. Only the name and email are used for the
            email pipeline; neither is sent to the AI provider.
          </p>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => void submitNewClient()}
              disabled={creating}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-3 text-xs font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              {creating ? "Saving…" : "Create & load"}
            </button>
          </div>
        </div>
      )}
      {loading ? (
        <p className="text-[11px] text-slate-500">Loading client context…</p>
      ) : loadedClient ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <p className="font-medium text-slate-800">Loaded client</p>
          <p className="mt-0.5 text-slate-700">{loadedClient.fullName}</p>
          <p className="text-slate-500">{loadedClient.email}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
            Name and email are shown for advisor convenience only. They are
            never sent to the AI provider.
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          Pick a client to load segment, stage, and recipient address.
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  spanFull,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  spanFull?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${spanFull ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface SelectOptionGroup {
  label: string;
  options: readonly SelectOption[];
}

function GroupedSelectField({
  label,
  value,
  onChange,
  groups,
  spanFull,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  groups: readonly SelectOptionGroup[];
  spanFull?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${spanFull ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
  placeholder,
  required,
  spanFull,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  spanFull?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${spanFull ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      <textarea
        value={value}
        rows={rows ?? 3}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
