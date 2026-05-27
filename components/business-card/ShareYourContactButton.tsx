"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Check, Loader2, X } from "lucide-react";

type Props = {
  recipientEmail: string;
  recipientName: string;
  className?: string;
};

type Status = "idle" | "submitting" | "success" | "error";

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  preferredContact: "" | "email" | "phone" | "either";
  message: string;
};

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  preferredContact: "",
  message: "",
};

export default function ShareYourContactButton({
  recipientEmail,
  recipientName,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-focus the first field when opening.
  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  const reset = () => {
    setForm(EMPTY);
    setStatus("idle");
    setErrorMsg(null);
  };

  const close = () => {
    setOpen(false);
    // Defer reset so the closing animation doesn't show empty success state.
    window.setTimeout(reset, 300);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/business-card/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail,
          recipientName,
          name: form.name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          preferredContact: form.preferredContact,
          message: form.message,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status}).`);
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";
  const labelCls = "block text-[12px] font-medium text-slate-700";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label="Share your contact"
      >
        <Send className="h-4 w-4" />
        <span>Share Your Contact</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Share your contact with ${recipientName}`}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          />

          {/* Sheet / modal */}
          <div
            className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-[440px] sm:rounded-2xl"
            style={{ animation: "sheetIn 220ms ease-out" }}
          >
            {/* Drag handle (mobile cue) */}
            <div className="flex justify-center pt-2 sm:hidden">
              <span className="block h-1 w-10 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-start justify-between px-5 pt-4 pb-2 sm:px-6 sm:pt-5">
              <div>
                <h2 className="text-[16px] font-semibold text-slate-900 sm:text-[18px]">
                  Share your contact
                </h2>
                <p className="mt-0.5 text-[12px] text-slate-500 sm:text-[13px]">
                  {recipientName} will receive your info and reach out.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mt-1 -mr-1 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {status === "success" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-[15px] font-semibold text-slate-900">
                  Thanks — your info was sent.
                </p>
                <p className="text-[13px] text-slate-500">
                  {recipientName} will be in touch shortly.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 rounded-lg bg-slate-900 px-5 py-2 text-[13px] font-semibold text-white hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={onSubmit}
                className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6"
              >
                <div>
                  <label htmlFor="lead-name" className={labelCls}>
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={firstFieldRef}
                    id="lead-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={`mt-1 ${inputCls}`}
                  />
                </div>

                <div>
                  <label htmlFor="lead-email" className={labelCls}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lead-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    maxLength={200}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={`mt-1 ${inputCls}`}
                  />
                </div>

                <div>
                  <label htmlFor="lead-phone" className={labelCls}>
                    Phone number
                  </label>
                  <input
                    id="lead-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={40}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={`mt-1 ${inputCls}`}
                  />
                </div>

                <div>
                  <label htmlFor="lead-company" className={labelCls}>
                    Company
                  </label>
                  <input
                    id="lead-company"
                    name="company"
                    type="text"
                    autoComplete="organization"
                    maxLength={120}
                    value={form.company}
                    onChange={(e) =>
                      setForm({ ...form, company: e.target.value })
                    }
                    className={`mt-1 ${inputCls}`}
                  />
                </div>

                <div>
                  <label htmlFor="lead-pref" className={labelCls}>
                    Preferred contact method{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="lead-pref"
                    name="preferredContact"
                    required
                    value={form.preferredContact}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        preferredContact: e.target
                          .value as FormState["preferredContact"],
                      })
                    }
                    className={`mt-1 ${inputCls} bg-white`}
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="either">Either</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="lead-message" className={labelCls}>
                    Short message
                  </label>
                  <textarea
                    id="lead-message"
                    name="message"
                    rows={3}
                    maxLength={2000}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    className={`mt-1 ${inputCls} resize-none`}
                  />
                </div>

                {errorMsg ? (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700"
                  >
                    {errorMsg}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <style>{`
            @keyframes sheetIn {
              from { transform: translateY(24px); opacity: 0; }
              to   { transform: translateY(0);    opacity: 1; }
            }
          `}</style>
        </div>
      ) : null}
    </>
  );
}
