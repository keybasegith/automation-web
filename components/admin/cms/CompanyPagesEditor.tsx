"use client";

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import type { ContentPage, ContentPagesContent } from "@/lib/cms/types";
import { required } from "@/lib/cms/validation";
import { useCmsDoc } from "./useCmsDoc";
import { ToastProvider } from "./Toast";
import PublishBar from "./PublishBar";
import LivePagePreview from "./LivePagePreview";
import { Card, TextField, TextAreaField } from "./fields";

function validateContent(c: ContentPagesContent): string | null {
  for (const p of c.pages) {
    if (!required(p.heading).ok) return `${p.label} needs a heading.`;
  }
  return null;
}

export default function CompanyPagesEditor() {
  return (
    <ToastProvider>
      <Editor />
    </ToastProvider>
  );
}

function Editor() {
  const ctrl = useCmsDoc<ContentPagesContent>("content-pages");
  const c = ctrl.draft;
  const [focused, setFocused] = useState(0);

  const patch = (i: number, p: Partial<ContentPage>) =>
    ctrl.setDraft((prev) => {
      const pages = [...prev.pages];
      pages[i] = { ...pages[i], ...p };
      return { ...prev, pages };
    });

  return (
    <div className="flex min-h-screen flex-col">
      <PublishBar
        controller={ctrl}
        title="Company Pages"
        subtitle="Edit the heading, intro, and SEO for the About and CEO Message pages."
        validate={validateContent}
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
        ) : c ? (
          <div className="mx-auto flex max-w-6xl gap-8">
            <div className="grid min-w-0 flex-1 gap-6">
            {c.pages.map((page, i) => (
              <Card key={page.slug} title={page.label}>
                <div className="grid gap-4" onFocusCapture={() => setFocused(i)}>
                  {page.eyebrow !== undefined && (
                    <TextField
                      label="Eyebrow (small label above the heading)"
                      value={page.eyebrow}
                      onChange={(v) => patch(i, { eyebrow: v })}
                    />
                  )}
                  <TextField
                    label="Heading"
                    value={page.heading}
                    onChange={(v) => patch(i, { heading: v })}
                  />
                  <TextAreaField
                    label="Intro paragraph"
                    hint="Shown under the heading (leave blank if the page has none)."
                    value={page.intro}
                    onChange={(v) => patch(i, { intro: v })}
                    rows={3}
                  />
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Search engine (SEO)
                    </p>
                    <div className="grid gap-4">
                      <TextField
                        label="SEO title"
                        value={page.seoTitle}
                        onChange={(v) => patch(i, { seoTitle: v })}
                      />
                      <TextAreaField
                        label="Meta description"
                        value={page.seoDescription}
                        onChange={(v) => patch(i, { seoDescription: v })}
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
              </Card>
            ))}
            </div>

            {/* Live preview of the page being edited */}
            <div className="hidden w-[460px] shrink-0 xl:block">
              <div className="sticky top-24">
                <LivePagePreview
                  controller={ctrl}
                  path={`/${(c.pages[focused] ?? c.pages[0])?.slug ?? "about"}`}
                  canSave={validateContent(c) === null}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
