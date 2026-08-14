"use client";

import { useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import {
  ATTENDING_OPTIONS,
  TRIP,
  type AttendingValue,
} from "@/lib/mexico-trip/config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD =
  "w-full rounded-lg border border-[#0B2237]/15 bg-white px-3.5 py-2.5 text-[15px] text-[#0B2237] outline-none transition placeholder:text-[#0B2237]/30 focus:border-[#0A7A8C] focus:ring-2 focus:ring-[#0A7A8C]/15";

const SUBMIT =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#F0543C] text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(240,84,60,0.3)] transition hover:bg-[#DE472F] disabled:cursor-not-allowed disabled:opacity-60";

function Label({ children, htmlFor, required = false }: {
  children: React.ReactNode;
  htmlFor: string;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[13px] font-semibold text-[#0B2237]"
    >
      {children}
      {required && <span className="ml-0.5 text-[#C93A24]">*</span>}
    </label>
  );
}

export function RsvpForm() {
  const [attending, setAttending] = useState<AttendingValue | "">("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [passportReady, setPassportReady] = useState(false);
  const [dietary, setDietary] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<AttendingValue | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!attending) return setError("Please choose an answer above.");
    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!EMAIL_RE.test(email.trim())) {
      return setError("Please enter a valid email address.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/mexico-trip/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          attending,
          passportReady,
          dietary,
          message,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error ?? "Something went wrong. Please try again.");
      }
      setDone(attending);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const yes = done === "yes";
    const maybe = done === "maybe";
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-[0_20px_60px_rgba(6,20,36,0.25)] sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F0F8] text-[#0A7A8C]">
          <Check className="h-7 w-7" strokeWidth={2.25} />
        </span>
        <h3 className="font-franklin font-display mt-6 text-2xl font-semibold text-[#0B2237] sm:text-3xl">
          {yes
            ? "You're on the list. ¡Bienvenidos!"
            : maybe
              ? "Noted — we'll hold your place."
              : "Thank you for letting us know."}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[#0B2237]/60">
          {yes
            ? `We've saved your spot for ${TRIP.dateLabel}. ${TRIP.note}`
            : maybe
              ? `We'll keep your place while you confirm. ${TRIP.note}`
              : "We're sorry to miss you. If plans change, submit the form again with the same email and we'll update your response."}
        </p>

        {done !== "no" && (
          <a href="/api/mexico-trip/ics" className={`${SUBMIT} mt-7 px-7 py-3`}>
            <CalendarPlus className="h-4 w-4" />
            Add to my calendar
          </a>
        )}

        <div>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="mt-6 text-sm font-medium text-[#0A7A8C] underline-offset-4 hover:underline"
          >
            Change my response
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(6,20,36,0.25)] sm:p-9"
      noValidate
    >
      <fieldset>
        <legend className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0B2237]/55">
          Your response
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {ATTENDING_OPTIONS.map((option) => {
            const selected = attending === option.value;
            return (
              <label
                key={option.value}
                className={`relative cursor-pointer rounded-xl border p-4 transition ${
                  selected
                    ? "border-[#0A7A8C] bg-[#F3F7FB] ring-1 ring-[#0A7A8C]"
                    : "border-[#0B2237]/15 bg-white hover:border-[#0B2237]/35"
                }`}
              >
                <input
                  type="radio"
                  name="attending"
                  value={option.value}
                  checked={selected}
                  onChange={() => setAttending(option.value)}
                  className="sr-only"
                />
                <span
                  className={`absolute right-3.5 top-3.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border transition ${
                    selected
                      ? "border-[#0A7A8C] bg-[#0A7A8C] text-white"
                      : "border-[#0B2237]/25 bg-white text-transparent"
                  }`}
                  aria-hidden
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="block pr-6 text-sm font-semibold leading-snug text-[#0B2237]">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-[#0B2237]/50">
                  {option.hint}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="rsvp-name" required>
            Full name
          </Label>
          <input
            id="rsvp-name"
            className={FIELD}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As it appears on your passport"
          />
        </div>
        <div>
          <Label htmlFor="rsvp-email" required>
            Work email
          </Label>
          <input
            id="rsvp-email"
            type="email"
            className={FIELD}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@keybasefinancial.com"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div>
          <Label htmlFor="rsvp-dietary">
            Dietary or accessibility requirements
          </Label>
          <input
            id="rsvp-dietary"
            className={FIELD}
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
            placeholder="Allergies, preferences, mobility — anything we should plan around"
          />
        </div>
        <div>
          <Label htmlFor="rsvp-message">Anything else?</Label>
          <textarea
            id="rsvp-message"
            rows={3}
            className={`${FIELD} resize-y`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Questions or timing conflicts we should know about"
          />
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#0B2237]/65">
        <input
          type="checkbox"
          checked={passportReady}
          onChange={(e) => setPassportReady(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#0A7A8C]"
        />
        <span>
          My passport is valid through at least May 2027.{" "}
          <span className="text-[#0B2237]/45">
            If not, leave this unchecked and start your renewal soon — fall
            processing times get long.
          </span>
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-[#C93A24]/25 bg-[#C93A24]/[0.06] px-4 py-3 text-sm font-medium text-[#A72E1B]"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={`${SUBMIT} mt-7 w-full px-7 py-3.5`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          "Send my response"
        )}
      </button>

      <p className="mt-4 text-center text-xs leading-relaxed text-[#0B2237]/45">
        {TRIP.rsvpByLabel}. Responses go only to the trip planning team; you can
        update yours any time by submitting again with the same email.
      </p>
    </form>
  );
}
