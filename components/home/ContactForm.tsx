"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
  consent: boolean;
};

const INITIAL: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  topic: "",
  message: "",
  consent: false,
};

const TOPICS = [
  "Wealth Management",
  "Investment Advisory",
  "Retirement & Estate Planning",
  "Insurance Solutions",
  "General Inquiry",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldClass =
  "w-full border border-black/15 bg-white px-4 py-3 text-[15px] text-[#1a2433] outline-none transition-colors placeholder:text-[#9aa3ad] focus:border-[#0a1f33]";
const labelClass =
  "mb-2 block text-[13px] font-semibold tracking-wide text-[#1a2433]";

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!form.message.trim()) {
      setError("Please include a short message about your inquiry.");
      return;
    }
    if (!form.consent) {
      setError("Please agree to be contacted before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-start rounded-xl border border-black/10 bg-[#f7f8fa] p-10 sm:p-12">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a1f33] text-white">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <h3 className="mt-6 font-serif text-3xl font-normal text-[#0a1f33]">
          Thank you — we&apos;ve received your inquiry.
        </h3>
        <p className="mt-4 text-[15px] leading-relaxed text-[#5b6573]">
          A Keybase advisor will be in touch within one business day. If your
          matter is time-sensitive, please call us at{" "}
          <a href="tel:+19057097911" className="font-semibold text-[#0a1f33]">
            905-709-7911
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-black/10 bg-white p-8 shadow-[0_1px_3px_rgba(10,31,51,0.06)] sm:p-10"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name *
          </label>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            className={fieldClass}
            placeholder="Jane"
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name *
          </label>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            className={fieldClass}
            placeholder="Doe"
          />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email *
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={fieldClass}
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={fieldClass}
            placeholder="(416) 555-0123"
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="topic" className={labelClass}>
          How can we help?
        </label>
        <select
          id="topic"
          value={form.topic}
          onChange={(e) => update("topic", e.target.value)}
          className={`${fieldClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b6573%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[right_1rem_center] bg-no-repeat pr-10`}
        >
          <option value="">Select a topic</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <label htmlFor="message" className={labelClass}>
          Message *
        </label>
        <textarea
          id="message"
          rows={5}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className={`${fieldClass} resize-y`}
          placeholder="Tell us a little about what you're looking for."
        />
      </div>

      <label className="mt-6 flex items-start gap-3">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => update("consent", e.target.checked)}
          className="mt-1 h-4 w-4 flex-shrink-0 accent-[#0a1f33]"
        />
        <span className="text-[13px] leading-relaxed text-[#5b6573]">
          I agree to be contacted by Keybase Financial Group about my inquiry and
          have read the{" "}
          <a href="#" className="font-semibold text-[#0a1f33] underline">
            Privacy Policy
          </a>
          . This form is for general inquiries and does not constitute financial
          advice.
        </span>
      </label>

      {error && (
        <p className="mt-5 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="group mt-7 inline-flex items-center gap-2 bg-[#0a1f33] px-8 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#0e2a45] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Submit Inquiry"}
        {!submitting && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        )}
      </button>
    </form>
  );
}
