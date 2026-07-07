"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  location: string;
  bookOfBusiness: string;
  investments: string[];
  doesInsurance: string;
  licensing: string[];
  ageRange: string;
  yearsInBusiness: string;
  businessMode: string;
  consent: boolean;
};

const INITIAL: FormState = {
  name: "",
  email: "",
  phone: "",
  location: "",
  bookOfBusiness: "",
  investments: [],
  doesInsurance: "",
  licensing: [],
  ageRange: "",
  yearsInBusiness: "",
  businessMode: "",
  consent: false,
};

const BOOK_OF_BUSINESS = ["Under $5M", "$5M – $10M", "$10M – $20M", "Over $20M"];
const INVESTMENTS = ["Mutual Funds", "EMD", "Liquid ALTs", "Seg Funds"];
const INSURANCE = ["Yes", "No"];
const LICENSING = [
  "FSRA",
  "CIRO – ID Investment Advisor",
  "CIRO – MD – Financial Advisor",
];
const AGE_RANGE = ["18 – 30", "30 – 45", "45 – 55", "Over 55"];
const YEARS_IN_BUSINESS = ["Under 5 yrs", "Over 5 yrs"];
const BUSINESS_MODE = ["Growth", "Maintenance"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fieldClass =
  "w-full border border-black/15 bg-white px-4 py-3 text-[15px] text-[#1a2433] outline-none transition-colors placeholder:text-[#9aa3ad] focus:border-[#0a1f33]";
const labelClass =
  "mb-2 block text-[13px] font-semibold tracking-wide text-[#1a2433]";
const legendClass =
  "mb-3 block text-[13px] font-semibold tracking-wide text-[#1a2433]";

/** Selectable pill used for both single- (radio) and multi- (checkbox) select. */
function SelectPill({
  type,
  name,
  label,
  checked,
  onChange,
}: {
  type: "radio" | "checkbox";
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 border px-4 py-3 text-[14px] font-medium transition-colors ${
        checked
          ? "border-[#0a1f33] bg-[#0a1f33] text-white"
          : "border-black/15 bg-white text-[#1a2433] hover:border-[#0a1f33]/50"
      }`}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center border ${
          type === "radio" ? "rounded-full" : "rounded-[3px]"
        } ${checked ? "border-white bg-white" : "border-black/30"}`}
      >
        {checked && <Check className="h-3 w-3 text-[#0a1f33]" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

export default function BecomeAdvisorForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleMulti = (key: "investments" | "licensing", value: string) => {
    setForm((f) => {
      const current = f[key];
      return {
        ...f,
        [key]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!form.consent) {
      setError("Please agree to be contacted before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/become-an-advisor", {
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
          Thank you — we&apos;ve received your application.
        </h3>
        <p className="mt-4 text-[15px] leading-relaxed text-[#5b6573]">
          A member of our advisor development team will review your details and
          reach out within two business days to discuss the opportunity. If your
          matter is time-sensitive, please call us at{" "}
          <a href="tel:+14164509000" className="font-semibold text-[#0a1f33]">
            416-450-9000
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
      {/* Contact details */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className={labelClass}>
            Name *
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={fieldClass}
            placeholder="Jane Doe"
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
        <div className="sm:col-span-2">
          <label htmlFor="location" className={labelClass}>
            Location
          </label>
          <input
            id="location"
            type="text"
            autoComplete="address-level2"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            className={fieldClass}
            placeholder="City, Province"
          />
        </div>
      </div>

      <hr className="my-8 border-black/10" />

      {/* Book of business */}
      <fieldset>
        <legend className={legendClass}>Book of business</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {BOOK_OF_BUSINESS.map((opt) => (
            <SelectPill
              key={opt}
              type="radio"
              name="bookOfBusiness"
              label={opt}
              checked={form.bookOfBusiness === opt}
              onChange={() => update("bookOfBusiness", opt)}
            />
          ))}
        </div>
      </fieldset>

      {/* Investments offered */}
      <fieldset className="mt-8">
        <legend className={legendClass}>
          What kind of investments do you offer clients?{" "}
          <span className="font-normal text-[#9aa3ad]">(tick all that apply)</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {INVESTMENTS.map((opt) => (
            <SelectPill
              key={opt}
              type="checkbox"
              name="investments"
              label={opt}
              checked={form.investments.includes(opt)}
              onChange={() => toggleMulti("investments", opt)}
            />
          ))}
        </div>
      </fieldset>

      {/* Insurance */}
      <fieldset className="mt-8">
        <legend className={legendClass}>Do you also do insurance?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {INSURANCE.map((opt) => (
            <SelectPill
              key={opt}
              type="radio"
              name="doesInsurance"
              label={opt}
              checked={form.doesInsurance === opt}
              onChange={() => update("doesInsurance", opt)}
            />
          ))}
        </div>
      </fieldset>

      {/* Licensing */}
      <fieldset className="mt-8">
        <legend className={legendClass}>
          Current licensing{" "}
          <span className="font-normal text-[#9aa3ad]">(tick all that apply)</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {LICENSING.map((opt) => (
            <SelectPill
              key={opt}
              type="checkbox"
              name="licensing"
              label={opt}
              checked={form.licensing.includes(opt)}
              onChange={() => toggleMulti("licensing", opt)}
            />
          ))}
        </div>
      </fieldset>

      {/* Age range */}
      <fieldset className="mt-8">
        <legend className={legendClass}>Age range</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {AGE_RANGE.map((opt) => (
            <SelectPill
              key={opt}
              type="radio"
              name="ageRange"
              label={opt}
              checked={form.ageRange === opt}
              onChange={() => update("ageRange", opt)}
            />
          ))}
        </div>
      </fieldset>

      {/* Years in business */}
      <fieldset className="mt-8">
        <legend className={legendClass}>Years in business</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {YEARS_IN_BUSINESS.map((opt) => (
            <SelectPill
              key={opt}
              type="radio"
              name="yearsInBusiness"
              label={opt}
              checked={form.yearsInBusiness === opt}
              onChange={() => update("yearsInBusiness", opt)}
            />
          ))}
        </div>
      </fieldset>

      {/* Business mode */}
      <fieldset className="mt-8">
        <legend className={legendClass}>Business mode</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {BUSINESS_MODE.map((opt) => (
            <SelectPill
              key={opt}
              type="radio"
              name="businessMode"
              label={opt}
              checked={form.businessMode === opt}
              onChange={() => update("businessMode", opt)}
            />
          ))}
        </div>
      </fieldset>

      <label className="mt-8 flex items-start gap-3">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => update("consent", e.target.checked)}
          className="mt-1 h-4 w-4 flex-shrink-0 accent-[#0a1f33]"
        />
        <span className="text-[13px] leading-relaxed text-[#5b6573]">
          I agree to be contacted by Keybase Financial Group about advisor
          opportunities and have read the{" "}
          <a href="#" className="font-semibold text-[#0a1f33] underline">
            Privacy Policy
          </a>
          . The information provided will be treated as confidential.
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
        {submitting ? "Submitting…" : "Submit Application"}
        {!submitting && (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        )}
      </button>
    </form>
  );
}
