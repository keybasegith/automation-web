"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  RISK_PROFILES,
  type ClientProfileData,
  type RiskProfile,
} from "@/lib/onboarding";

export type OnboardingFormInitialValues = Partial<ClientProfileData>;

export interface OnboardingFormProps {
  defaultAdvisorName?: string;
  initialValues?: OnboardingFormInitialValues;
  /**
   * If provided, the form is editing an existing onboarding (PATCH);
   * otherwise it creates a new client + onboarding (POST).
   */
  onboardingId?: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  country: string;
  employmentStatus: string;
  annualIncome: string;
  riskProfile: RiskProfile;
  advisorName: string;
}

const buildInitialState = (
  defaultAdvisorName: string,
  initial?: OnboardingFormInitialValues
): FormState => ({
  firstName: initial?.firstName ?? "",
  lastName: initial?.lastName ?? "",
  email: initial?.email ?? "",
  phone: initial?.phone ?? "",
  dateOfBirth: initial?.dateOfBirth ?? "",
  address: initial?.address ?? "",
  city: initial?.city ?? "",
  country: initial?.country ?? "",
  employmentStatus: initial?.employmentStatus ?? "",
  annualIncome:
    initial?.annualIncome === null || initial?.annualIncome === undefined
      ? ""
      : String(initial.annualIncome),
  riskProfile: initial?.riskProfile ?? "Medium",
  advisorName: initial?.advisorName ?? defaultAdvisorName,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingForm({
  defaultAdvisorName = "",
  initialValues,
  onboardingId,
}: OnboardingFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(
    buildInitialState(defaultAdvisorName, initialValues)
  );
  const [submitting, setSubmitting] = useState<null | "draft" | "generate">(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!state.firstName.trim()) return "First name is required.";
    if (!state.lastName.trim()) return "Last name is required.";
    if (!EMAIL_PATTERN.test(state.email.trim())) {
      return "A valid email address is required.";
    }
    if (state.annualIncome) {
      const n = Number(state.annualIncome);
      if (!Number.isFinite(n) || n < 0) {
        return "Annual income must be a non-negative number.";
      }
    }
    return null;
  };

  const buildPayload = () => ({
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    email: state.email.trim().toLowerCase(),
    phone: state.phone.trim() || null,
    dateOfBirth: state.dateOfBirth || null,
    address: state.address.trim() || null,
    city: state.city.trim() || null,
    country: state.country.trim() || null,
    employmentStatus: state.employmentStatus.trim() || null,
    annualIncome:
      state.annualIncome === "" ? null : Number(state.annualIncome),
    riskProfile: state.riskProfile,
    advisorName: state.advisorName.trim() || null,
  });

  const submit = async (mode: "draft" | "generate") => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(mode);

    try {
      let targetId = onboardingId;

      if (targetId) {
        const res = await fetch(`/api/onboarding/${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Update failed (${res.status})`);
        }
      } else {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Create failed (${res.status})`);
        }
        const data = (await res.json()) as { onboardingId: string };
        targetId = data.onboardingId;
      }

      if (mode === "generate" && targetId) {
        const res = await fetch(`/api/onboarding/${targetId}/generate`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Document generation failed (${res.status})`);
        }
      }

      if (targetId) {
        router.push(`/onboarding/${targetId}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(null);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit("generate");
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Section title="Basic Info">
        <Field
          label="First Name"
          required
          value={state.firstName}
          onChange={(v) => update("firstName", v)}
        />
        <Field
          label="Last Name"
          required
          value={state.lastName}
          onChange={(v) => update("lastName", v)}
        />
        <Field
          label="Email"
          required
          type="email"
          value={state.email}
          onChange={(v) => update("email", v)}
        />
        <Field
          label="Phone"
          type="tel"
          value={state.phone}
          onChange={(v) => update("phone", v)}
        />
      </Section>

      <Section title="Personal Details">
        <Field
          label="Date of Birth"
          type="date"
          value={state.dateOfBirth}
          onChange={(v) => update("dateOfBirth", v)}
        />
        <Field
          label="Address"
          value={state.address}
          onChange={(v) => update("address", v)}
          spanFull
        />
        <Field
          label="City"
          value={state.city}
          onChange={(v) => update("city", v)}
        />
        <Field
          label="Country"
          value={state.country}
          onChange={(v) => update("country", v)}
        />
      </Section>

      <Section title="Financial Info">
        <Field
          label="Employment Status"
          value={state.employmentStatus}
          onChange={(v) => update("employmentStatus", v)}
        />
        <Field
          label="Annual Income (USD)"
          type="number"
          inputMode="numeric"
          value={state.annualIncome}
          onChange={(v) => update("annualIncome", v)}
        />
        <SelectField
          label="Risk Profile"
          required
          value={state.riskProfile}
          onChange={(v) => update("riskProfile", v as RiskProfile)}
          options={RISK_PROFILES}
        />
      </Section>

      <Section title="Advisor Info">
        <Field
          label="Advisor Name"
          value={state.advisorName}
          onChange={(v) => update("advisorName", v)}
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

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => submit("draft")}
          disabled={submitting !== null}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {submitting === "draft" ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="submit"
          disabled={submitting !== null}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting === "generate" ? "Generating…" : "Generate KYC/NAAF"}
        </button>
      </div>
    </form>
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

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "date" | "number";
  inputMode?: "text" | "numeric" | "tel" | "email";
  required?: boolean;
  spanFull?: boolean;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  required,
  spanFull,
}: FieldProps) {
  return (
    <label className={`flex flex-col gap-1.5 ${spanFull ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
