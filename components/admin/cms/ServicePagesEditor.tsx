"use client";

import { useMemo, useRef, useState } from "react";
import {
  Loader2,
  ChevronDown,
  ExternalLink,
  Upload,
  ImageOff,
} from "lucide-react";
import type { ServicePageContent, ServicePagesContent } from "@/lib/cms/types";
import { required, safeUrl } from "@/lib/cms/validation";
import { useCmsDoc } from "./useCmsDoc";
import { ToastProvider, useToast } from "./Toast";
import PublishBar from "./PublishBar";
import LivePagePreview from "./LivePagePreview";
import { TextField, TextAreaField, fieldInputClass } from "./fields";

function validateServicePages(content: ServicePagesContent): string | null {
  for (const p of content.pages) {
    if (!required(p.heading).ok) return `${p.breadcrumbLabel} needs a heading.`;
    if (!required(p.intro).ok) return `${p.breadcrumbLabel} needs an intro paragraph.`;
    for (const [v, label] of [
      [p.heroImage, `${p.breadcrumbLabel} hero image`],
      [p.ctaUrl, `${p.breadcrumbLabel} button link`],
    ] as const) {
      const r = safeUrl(v, label);
      if (!r.ok) return r.message;
    }
  }
  return null;
}

export default function ServicePagesEditor() {
  return (
    <ToastProvider>
      <Editor />
    </ToastProvider>
  );
}

function Editor() {
  const ctrl = useCmsDoc<ServicePagesContent>("service-pages");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const pages = useMemo(() => ctrl.draft?.pages ?? [], [ctrl.draft]);

  // Group pages by their `group` for a tidy, scannable list.
  const groups = useMemo(() => {
    const map = new Map<string, { page: ServicePageContent; index: number }[]>();
    pages.forEach((page, index) => {
      const arr = map.get(page.group) ?? [];
      arr.push({ page, index });
      map.set(page.group, arr);
    });
    return [...map.entries()];
  }, [pages]);

  const patch = (index: number, p: Partial<ServicePageContent>) =>
    ctrl.setDraft((prev) => {
      const next = [...prev.pages];
      next[index] = { ...next[index], ...p };
      return { ...prev, pages: next };
    });

  return (
    <div className="flex min-h-screen flex-col">
      <PublishBar
        controller={ctrl}
        title="Service Pages"
        subtitle="Edit the hero heading, intro, image, button, and SEO for each services page."
        validate={validateServicePages}
      />

      <div className="flex-1 px-6 py-8 sm:px-10">
        {ctrl.loading ? (
          <div className="flex items-center gap-2 py-24 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : ctrl.loadError ? (
          <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ctrl.loadError}
          </div>
        ) : (
          <div className="mx-auto flex max-w-6xl gap-8">
            <div className="min-w-0 flex-1 space-y-8">
              {groups.map(([group, entries]) => (
                <section key={group}>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {group}
                  </h2>
                  <div className="space-y-2">
                    {entries.map(({ page, index }) => (
                      <PageCard
                        key={page.slug}
                        page={page}
                        open={openSlug === page.slug}
                        onToggle={() =>
                          setOpenSlug(openSlug === page.slug ? null : page.slug)
                        }
                        onChange={(p) => patch(index, p)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* Live preview — the actual page, updating as you type. */}
            <div className="hidden w-[460px] shrink-0 xl:block">
              <div className="sticky top-24">
                <LivePagePreview
                  controller={ctrl}
                  path={`/${openSlug ?? pages[0]?.slug ?? ""}`}
                  canSave={ctrl.draft ? validateServicePages(ctrl.draft) === null : false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PageCard({
  page,
  open,
  onToggle,
  onChange,
}: {
  page: ServicePageContent;
  open: boolean;
  onToggle: () => void;
  onChange: (p: Partial<ServicePageContent>) => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/website-admin-cms/media", { method: "POST", body });
      const data = await res.json();
      if (res.ok) onChange({ heroImage: data.item?.fileUrl ?? data.url });
      else toast.error(data?.error ?? "Upload failed.");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100">
            {page.heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.heroImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageOff className="h-4 w-4 text-slate-300" />
            )}
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              {page.breadcrumbLabel}
            </span>
            <span className="block truncate text-xs text-slate-400">/{page.slug}</span>
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Category label"
                hint="Shown above the heading and in the breadcrumb."
                value={page.eyebrow}
                onChange={(v) => onChange({ eyebrow: v })}
              />
              <TextField
                label="Breadcrumb / page name"
                value={page.breadcrumbLabel}
                onChange={(v) => onChange({ breadcrumbLabel: v })}
              />
            </div>

            <TextField
              label="Hero heading"
              value={page.heading}
              onChange={(v) => onChange({ heading: v })}
            />
            <TextAreaField
              label="Hero intro"
              value={page.intro}
              onChange={(v) => onChange({ intro: v })}
              rows={3}
            />

            {/* Hero image */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Hero background image
              </label>
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-black/5">
                  {page.heroImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={page.heroImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-4 w-4 text-slate-300" />
                  )}
                </span>
                <div className="flex-1">
                  <input
                    value={page.heroImage}
                    onChange={(e) => onChange({ heroImage: e.target.value })}
                    placeholder="/image.jpg"
                    className={fieldInputClass}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Replace Image
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Button label"
                value={page.ctaLabel}
                onChange={(v) => onChange({ ctaLabel: v })}
              />
              <TextField
                label="Button link"
                value={page.ctaUrl}
                onChange={(v) => onChange({ ctaUrl: v })}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Search engine (SEO)
              </p>
              <div className="grid gap-4">
                <TextField
                  label="SEO title"
                  value={page.seoTitle}
                  onChange={(v) => onChange({ seoTitle: v })}
                />
                <TextAreaField
                  label="Meta description"
                  value={page.seoDescription}
                  onChange={(v) => onChange({ seoDescription: v })}
                  rows={2}
                />
              </div>
            </div>

            <a
              href={`/${page.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#006d6e] hover:underline"
            >
              <ExternalLink className="h-4 w-4" /> View this page
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
