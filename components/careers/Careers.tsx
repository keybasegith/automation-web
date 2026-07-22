"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, MapPin, Briefcase, Upload, FileText, X } from "lucide-react";
import type { JobPosting } from "@/lib/cms/types";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  linkedin: string;
  message: string;
  consent: boolean;
};

const INITIAL: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  linkedin: "",
  message: "",
  consent: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const RESUME_EXT_RE = /\.(pdf|doc|docx)$/i;
const RESUME_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fieldClass =
  "w-full border border-black/15 bg-white px-4 py-3 text-[15px] text-[#1a2433] outline-none transition-colors placeholder:text-[#9aa3ad] focus:border-[#0a1f33]";
const labelClass =
  "mb-2 block text-[13px] font-semibold tracking-wide text-[#1a2433]";

export default function Careers({ roles }: { roles: JobPosting[] }) {
  const POSITION_OPTIONS = [...roles.map((r) => r.title), "General Application"];
  const [form, setForm] = useState<FormState>(INITIAL);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const acceptFile = (file?: File | null) => {
    if (!file) return;
    if (!RESUME_EXT_RE.test(file.name)) {
      setError("Please upload a PDF or Word document.");
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setError("Your resume must be 5MB or smaller.");
      return;
    }
    setError(null);
    setResumeFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const applyFor = (title: string) => {
    setForm((f) => ({ ...f, position: title }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (!form.position.trim()) {
      setError("Please select the role you're applying for.");
      return;
    }
    if (!resumeFile && !form.message.trim()) {
      setError(
        "Please attach your resume or add a short note about your background.",
      );
      return;
    }
    if (!form.consent) {
      setError("Please agree to be contacted before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("firstName", form.firstName.trim());
      fd.append("lastName", form.lastName.trim());
      fd.append("email", form.email.trim());
      fd.append("phone", form.phone.trim());
      fd.append("position", form.position.trim());
      fd.append("linkedin", form.linkedin.trim());
      fd.append("message", form.message.trim());
      fd.append("consent", String(form.consent));
      if (resumeFile) fd.append("resume", resumeFile);

      const res = await fetch("/api/careers", {
        method: "POST",
        body: fd,
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

  return (
    <div>
      {/* Open roles */}
      <section id="open-roles" className="scroll-mt-24">
        <div className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#006d6e]">
            Open Roles
          </p>
          <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
            Find your place at Keybase.
          </h2>
        </div>

        <div className="mt-12 divide-y divide-black/10 border-y border-black/10">
          {roles.map((role) => (
            <div
              key={role.id}
              className="grid gap-5 py-7 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10"
            >
              <div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <h3 className="font-serif text-[24px] font-normal text-[#0a1f33]">
                    {role.title}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#006d6e]">
                    {role.department}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#5b6573]">
                  {role.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-[#5b6573]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#9aa3ad]" strokeWidth={1.75} />
                    {role.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase
                      className="h-4 w-4 text-[#9aa3ad]"
                      strokeWidth={1.75}
                    />
                    {role.type}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => applyFor(role.title)}
                className="group inline-flex w-fit items-center gap-2 border border-[#0a1f33] px-6 py-3 text-[14px] font-semibold text-[#0a1f33] transition-colors hover:bg-[#0a1f33] hover:text-white"
              >
                Apply
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Application form */}
      <section
        ref={formRef}
        id="apply"
        className="mt-24 scroll-mt-24 border-t border-black/10 pt-20"
      >
        <div className="grid gap-12 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-20">
          <div className="lg:pt-2">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#006d6e]">
              Apply Now
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Tell us about yourself.
            </h2>
            <p className="mt-6 text-[16px] leading-relaxed text-[#5b6573]">
              Submit your application below and our talent team will review it
              personally. Don&apos;t see the right role? Choose{" "}
              <span className="font-semibold text-[#1a2433]">
                General Application
              </span>{" "}
              and we&apos;ll keep you in mind as new opportunities open.
            </p>
          </div>

          {done ? (
            <div className="flex flex-col items-start rounded-xl border border-black/10 bg-[#f7f8fa] p-10 sm:p-12">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a1f33] text-white">
                <Check className="h-6 w-6" strokeWidth={2.5} />
              </span>
              <h3 className="mt-6 font-serif text-3xl font-normal text-[#0a1f33]">
                Thank you — your application is in.
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed text-[#5b6573]">
                We&apos;ve received your application for{" "}
                <span className="font-semibold text-[#1a2433]">
                  {form.position}
                </span>
                . Our talent team reviews every submission and will reach out if
                there&apos;s a fit.
              </p>
            </div>
          ) : (
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
                <label htmlFor="position" className={labelClass}>
                  Role *
                </label>
                <select
                  id="position"
                  value={form.position}
                  onChange={(e) => update("position", e.target.value)}
                  className={`${fieldClass} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235b6573%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[right_1rem_center] bg-no-repeat pr-10`}
                >
                  <option value="">Select a role</option>
                  {POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <span className={labelClass}>Resume</span>
                {resumeFile ? (
                  <div className="flex items-center gap-3 border border-black/15 bg-[#f7f9fa] px-4 py-3">
                    <FileText
                      className="h-5 w-5 flex-shrink-0 text-[#006d6e]"
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[#1a2433]">
                        {resumeFile.name}
                      </p>
                      <p className="text-[12px] text-[#9aa3ad]">
                        {formatBytes(resumeFile.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      aria-label="Remove resume"
                      className="flex-shrink-0 rounded p-1 text-[#9aa3ad] transition-colors hover:bg-black/5 hover:text-[#1a2433]"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="resume"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragging(false);
                    }}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-8 text-center transition-colors ${
                      dragging
                        ? "border-[#0a1f33] bg-[#eef3f6]"
                        : "border-black/25 bg-white hover:border-[#0a1f33] hover:bg-[#f7f9fa]"
                    }`}
                  >
                    <Upload
                      className="h-6 w-6 text-[#9aa3ad]"
                      strokeWidth={1.75}
                    />
                    <span className="text-[14px] text-[#5b6573]">
                      <span className="font-semibold text-[#0a1f33]">
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </span>
                    <span className="text-[12px] text-[#9aa3ad]">
                      PDF or Word · up to 5MB
                    </span>
                    <input
                      id="resume"
                      type="file"
                      accept={RESUME_ACCEPT}
                      className="sr-only"
                      onChange={(e) => acceptFile(e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>

              <div className="mt-5">
                <label htmlFor="linkedin" className={labelClass}>
                  LinkedIn / Portfolio
                </label>
                <input
                  id="linkedin"
                  type="url"
                  value={form.linkedin}
                  onChange={(e) => update("linkedin", e.target.value)}
                  className={fieldClass}
                  placeholder="linkedin.com/in/…"
                />
              </div>

              <div className="mt-5">
                <label htmlFor="message" className={labelClass}>
                  Why Keybase? <span className="font-normal text-[#9aa3ad]">(optional)</span>
                </label>
                <textarea
                  id="message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  className={`${fieldClass} resize-y`}
                  placeholder="Tell us a little about your background and what draws you to Keybase."
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
                  I consent to Keybase Financial Group storing and reviewing my
                  application and contacting me about employment opportunities.
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
          )}
        </div>
      </section>
    </div>
  );
}
