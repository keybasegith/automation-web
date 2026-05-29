"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  timeline: string;
  consent: boolean;
};

const INITIAL: FormState = {
  fullName: "",
  email: "",
  phone: "",
  timeline: "",
  consent: false,
};

const TIMELINES = [
  "Within 3 months",
  "3 – 6 months",
  "6 – 12 months",
  "1+ year",
  "Just exploring",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TriviaForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }
    if (!form.consent) {
      setError("Please agree to be contacted before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trivia-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      router.push("/trivia-game");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/keybase-logo%20copy.png"
            alt="Keybase Financial Group"
            width={200}
            height={200}
            priority
            className="mb-6 h-16 w-16 rounded-2xl object-contain"
          />
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-brand">
            Keybase Financial Group
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Before you play
          </h1>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-slate-500">
            Share a few details to unlock the Finance Trivia Challenge. A
            Keybase advisor will follow up with insights for your goals.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
          <Field
            label="Full name"
            required
            value={form.fullName}
            onChange={(v) => update("fullName", v)}
            placeholder="Jane Doe"
            autoComplete="name"
          />

          <Field
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            placeholder="you@email.com"
            autoComplete="email"
            inputMode="email"
          />

          <Field
            label="Phone"
            required
            type="tel"
            value={form.phone}
            onChange={(v) => update("phone", v)}
            placeholder="(416) 555-0123"
            autoComplete="tel"
            inputMode="tel"
          />

          <Select
            label="Investment timeline"
            value={form.timeline}
            onChange={(v) => update("timeline", v)}
            options={TIMELINES}
            placeholder="When are you looking to invest?"
          />

          <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => update("consent", e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <span className="text-[13px] leading-relaxed text-slate-600">
              I consent to Keybase Financial Group contacting me by phone or
              email about my inquiry. I can unsubscribe at any time.
            </span>
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-xl bg-brand px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Starting your game…" : "Continue to the game"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Your information is kept private and used only by Keybase Financial
            Group.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url" | "none";
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-xl border border-slate-200 bg-white bg-[length:16px_16px] bg-[right_1rem_center] bg-no-repeat px-4 py-3 pr-10 text-[15px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${
          value ? "text-slate-900" : "text-slate-400"
        }`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="text-slate-900">
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
