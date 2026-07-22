"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import type { GlobalSettings, SocialLink } from "@/lib/cms/types";
import { safeUrl, email as vEmail, required } from "@/lib/cms/validation";
import { useCmsDoc } from "./useCmsDoc";
import { ToastProvider } from "./Toast";
import PublishBar from "./PublishBar";
import { Card, TextField, TextAreaField, fieldInputClass } from "./fields";

const PLATFORMS: SocialLink["platform"][] = [
  "linkedin",
  "x",
  "instagram",
  "youtube",
  "facebook",
  "other",
];

function validateSettings(s: GlobalSettings): string | null {
  if (!required(s.companyName).ok) return "Company name is required.";
  for (const [v, label] of [
    [s.logoUrl, "Logo URL"],
    [s.primaryCtaUrl, "Call-to-action link"],
    [s.headerAnnouncementUrl, "Announcement link"],
  ] as const) {
    const r = safeUrl(v, label);
    if (!r.ok) return r.message;
  }
  for (const [v, label] of [
    [s.generalEmail, "General email"],
    [s.supportEmail, "Support email"],
  ] as const) {
    const r = vEmail(v, label);
    if (!r.ok) return r.message;
  }
  for (const link of s.socialLinks) {
    const r = safeUrl(link.url, `${link.label || "Social"} link`);
    if (!r.ok) return r.message;
  }
  return null;
}

export default function GlobalSettingsEditor() {
  return (
    <ToastProvider>
      <Editor />
    </ToastProvider>
  );
}

function Editor() {
  const ctrl = useCmsDoc<GlobalSettings>("global-settings");
  const s = ctrl.draft;

  const set = <K extends keyof GlobalSettings>(key: K, value: GlobalSettings[K]) =>
    ctrl.setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex min-h-screen flex-col">
      <PublishBar
        controller={ctrl}
        title="Global Settings"
        subtitle="Company details shared across the whole website."
        validate={validateSettings}
      />

      <div className="flex-1 px-6 py-8 sm:px-10">
        {ctrl.loading ? (
          <Loading />
        ) : ctrl.loadError ? (
          <ErrorBox message={ctrl.loadError} />
        ) : s ? (
          <div className="mx-auto grid max-w-3xl gap-6">
            <Card title="Company Information">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Company name"
                  value={s.companyName}
                  onChange={(v) => set("companyName", v)}
                />
                <TextField
                  label="Logo image path"
                  hint="A path like /keybase-logo-nobg.png"
                  value={s.logoUrl}
                  onChange={(v) => set("logoUrl", v)}
                />
                <TextField
                  label="Logo alt text"
                  hint="Describes the logo for screen readers."
                  value={s.logoAlt}
                  onChange={(v) => set("logoAlt", v)}
                />
                <TextField
                  label="Office address"
                  value={s.address}
                  onChange={(v) => set("address", v)}
                />
              </div>
            </Card>

            <Card title="Contact Information">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Phone" value={s.phone} onChange={(v) => set("phone", v)} />
                <TextField
                  label="General email"
                  type="email"
                  value={s.generalEmail}
                  onChange={(v) => set("generalEmail", v)}
                />
                <TextField
                  label="Support / complaints email"
                  type="email"
                  value={s.supportEmail}
                  onChange={(v) => set("supportEmail", v)}
                />
              </div>
            </Card>

            <Card
              title="Social Links"
              description="Links shown in the website footer. Leave a row blank to remove it."
            >
              <div className="space-y-3">
                {s.socialLinks.map((link, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2">
                    <label className="flex-1">
                      <span className="mb-1 block text-xs font-medium text-slate-500">Platform</span>
                      <select
                        value={link.platform}
                        onChange={(e) => {
                          const next = [...s.socialLinks];
                          next[i] = { ...link, platform: e.target.value as SocialLink["platform"] };
                          set("socialLinks", next);
                        }}
                        className={fieldInputClass}
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p} value={p}>
                            {p === "x" ? "X (Twitter)" : p[0].toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex-1">
                      <span className="mb-1 block text-xs font-medium text-slate-500">Label</span>
                      <input
                        value={link.label}
                        onChange={(e) => {
                          const next = [...s.socialLinks];
                          next[i] = { ...link, label: e.target.value };
                          set("socialLinks", next);
                        }}
                        className={fieldInputClass}
                      />
                    </label>
                    <label className="flex-[2]">
                      <span className="mb-1 block text-xs font-medium text-slate-500">URL</span>
                      <input
                        value={link.url}
                        onChange={(e) => {
                          const next = [...s.socialLinks];
                          next[i] = { ...link, url: e.target.value };
                          set("socialLinks", next);
                        }}
                        placeholder="https://…"
                        className={fieldInputClass}
                      />
                    </label>
                    <button
                      type="button"
                      title="Remove"
                      onClick={() =>
                        set("socialLinks", s.socialLinks.filter((_, j) => j !== i))
                      }
                      className="mb-0.5 rounded-lg p-2.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    set("socialLinks", [
                      ...s.socialLinks,
                      { platform: "other", label: "", url: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-[#006d6e] hover:text-[#006d6e]"
                >
                  <Plus className="h-4 w-4" /> Add social link
                </button>
              </div>
            </Card>

            <Card title="Header & Calls to Action">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Header announcement text"
                  hint="The promo line in the top bar of the header."
                  value={s.headerAnnouncement}
                  onChange={(v) => set("headerAnnouncement", v)}
                />
                <TextField
                  label="Announcement link"
                  value={s.headerAnnouncementUrl}
                  onChange={(v) => set("headerAnnouncementUrl", v)}
                />
                <TextField
                  label="Primary button label"
                  hint='e.g. "Contact Us"'
                  value={s.primaryCtaLabel}
                  onChange={(v) => set("primaryCtaLabel", v)}
                />
                <TextField
                  label="Primary button link"
                  value={s.primaryCtaUrl}
                  onChange={(v) => set("primaryCtaUrl", v)}
                />
              </div>
            </Card>

            <Card title="Footer text">
              <TextAreaField
                label="Footer description"
                hint="The paragraph shown in the footer legal area."
                value={s.footerDescription}
                onChange={(v) => set("footerDescription", v)}
                rows={4}
              />
              <div className="mt-4">
                <TextField
                  label="Copyright line"
                  hint="Use {year} where the current year should appear."
                  value={s.copyrightText}
                  onChange={(v) => set("copyrightText", v)}
                />
              </div>
            </Card>

            <Card
              title="Default SEO"
              description="Used for pages that don't set their own title or description."
            >
              <div className="grid gap-4">
                <TextField
                  label="Default page title"
                  value={s.defaultSeoTitle}
                  onChange={(v) => set("defaultSeoTitle", v)}
                />
                <TextAreaField
                  label="Default meta description"
                  value={s.defaultSeoDescription}
                  onChange={(v) => set("defaultSeoDescription", v)}
                  rows={3}
                />
                <TextField
                  label="Default social sharing image"
                  hint="Path to an image used when pages are shared on social media."
                  value={s.defaultSocialImage}
                  onChange={(v) => set("defaultSocialImage", v)}
                />
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 py-24 text-sm text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
