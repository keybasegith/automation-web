"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Eye,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_KEYS,
  type ContentType,
} from "@/lib/content/types";
import { useArticleDraft } from "./useArticleDraft";
import BlockEditor from "./BlockEditor";
import SourceEditor from "./SourceEditor";
import HeroImageField from "./HeroImageField";
import SubmitDialog from "./SubmitDialog";
import VersionHistory from "./VersionHistory";
import ComplianceFeedback from "./ComplianceFeedback";
import {
  ErrorNotice,
  StatusBadge,
  WhenLabel,
  buttonPrimary,
  buttonSecondary,
  inputClass,
} from "./ui";

/**
 * The article editor.
 *
 * A writing surface on the left and settings on the right — the shape a writer
 * expects, not a database form. Everything that decides how the piece LOOKS
 * (fonts, colours, spacing, width, the eyebrow style, the disclosure block)
 * belongs to the Keybase template and is absent from this screen entirely.
 *
 * While compliance holds a version, the whole surface goes read-only. That is
 * cosmetic honesty rather than the control: the revision they are reading is
 * frozen in the database, and the API refuses a write to it regardless of what
 * this screen allows.
 */
export default function ArticleEditor({ articleId }: { articleId: string }) {
  const ctrl = useArticleDraft(articleId);
  const [submitting, setSubmitting] = useState(false);
  const [slugDraft, setSlugDraft] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  if (ctrl.loading) {
    return (
      <div className="flex items-center gap-2 px-8 py-24 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (ctrl.loadError || !ctrl.workspace || !ctrl.payload) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <ErrorNotice>{ctrl.loadError ?? "That article could not be loaded."}</ErrorNotice>
        <Link href="/content" className={`${buttonSecondary} mt-4`}>
          <ArrowLeft className="h-4 w-4" />
          Back to Content
        </Link>
      </div>
    );
  }

  const { article, permissions, openFeedback, revisions, draft } = ctrl.workspace;
  const payload = ctrl.payload;
  const locked = !permissions.edit;
  const config = CONTENT_TYPES[article.contentType];

  const availableTypes = CONTENT_TYPE_KEYS.filter((key) =>
    ctrl.workspace?.viewer.role === "admin"
      ? true
      : CONTENT_TYPES[key].advisorAuthored
  );

  const saveSettings = async (patch: { contentType?: string; slug?: string }) => {
    const result = await ctrl.updateSettings(patch);
    setSettingsError(result.ok ? null : (result.error ?? null));
    if (result.ok) setSlugDraft(null);
  };

  return (
    <div className="min-h-screen">
      {/* Sticky action bar. Save state lives here rather than in a toast, so
          "is my work safe?" is answerable without waiting for one. */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/content"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-[#006d6e]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Content
            </Link>
            <StatusBadge status={article.status} size="lg" />
            {draft && (
              <span className="font-mono text-xs text-slate-400">
                v{draft.revisionNumber}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SaveIndicator ctrl={ctrl} />
            <Link
              href={`/content/articles/${articleId}/preview`}
              target="_blank"
              className={buttonSecondary}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Link>
            {!locked && (
              <button
                type="button"
                onClick={() => void ctrl.saveNow()}
                disabled={ctrl.saveState === "saving" || !ctrl.dirty}
                className={buttonSecondary}
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
            )}
            {permissions.submit && (
              <button
                type="button"
                onClick={() => setSubmitting(true)}
                className={buttonPrimary}
              >
                <Send className="h-4 w-4" />
                Submit to Compliance
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {ctrl.conflict && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="flex items-start gap-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {ctrl.conflict}{" "}
                <button
                  type="button"
                  onClick={() => void ctrl.reload()}
                  className="font-semibold underline"
                >
                  Reload
                </button>
              </span>
            </p>
          </div>
        )}

        {locked && permissions.editBlockedReason && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {permissions.editBlockedReason}
          </div>
        )}

        {openFeedback && (
          <div className="mb-5">
            <ComplianceFeedback review={openFeedback} />
          </div>
        )}

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Writing surface */}
          <div className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="article-title">
              Article title
            </label>
            <textarea
              id="article-title"
              value={payload.title}
              disabled={locked}
              rows={1}
              onChange={(e) => {
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                ctrl.patch({ title: e.target.value });
              }}
              placeholder="Article title"
              className="w-full resize-none border-none bg-transparent font-serif text-[34px] leading-[1.1] tracking-tight text-slate-900 outline-none placeholder:text-slate-300 sm:text-[40px]"
            />

            <label className="sr-only" htmlFor="article-deck">
              Subtitle
            </label>
            <textarea
              id="article-deck"
              value={payload.deck}
              disabled={locked}
              rows={2}
              onChange={(e) => ctrl.patch({ deck: e.target.value })}
              placeholder="Subtitle — the standfirst printed under the headline"
              className="mt-4 w-full resize-none border-none bg-transparent text-lg leading-relaxed text-slate-500 outline-none placeholder:text-slate-300"
            />

            <hr className="my-7 border-slate-200" />

            <BlockEditor
              body={payload.body}
              disabled={locked}
              onChange={(body) => ctrl.patch({ body })}
            />

            <section className="mt-12">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Sources
              </h2>
              <p className="mb-3 mt-1 text-sm text-slate-400">
                Compliance opens every link here. A figure without one is the
                first thing they will ask about.
              </p>
              <SourceEditor
                sources={payload.sources}
                disabled={locked}
                onChange={(sources) => ctrl.patch({ sources })}
              />
            </section>

            <section className="mt-10">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Additional disclosure
              </h2>
              <p className="mb-3 mt-1 text-sm text-slate-400">
                Optional, and additive only. The mandatory Keybase disclosure is
                printed on every article and cannot be edited or removed here.
              </p>
              <textarea
                value={payload.additionalDisclosure}
                disabled={locked}
                rows={3}
                onChange={(e) =>
                  ctrl.patch({ additionalDisclosure: e.target.value })
                }
                placeholder="Anything this particular article has to say beyond the standard wording."
                className={`${inputClass} resize-y leading-relaxed`}
              />
            </section>
          </div>

          {/* Settings */}
          <aside className="w-full shrink-0 space-y-5 lg:w-80">
            <SettingsCard title="Article settings">
              <Row label="Author">
                <span className="text-sm text-slate-700">
                  {ctrl.workspace.owner?.name ?? "—"}
                  {ctrl.workspace.owner?.authorTitle && (
                    <span className="block text-xs text-slate-400">
                      {ctrl.workspace.owner.authorTitle}
                    </span>
                  )}
                </span>
              </Row>

              <Row label="Content type">
                <select
                  value={article.contentType}
                  disabled={locked}
                  onChange={(e) =>
                    void saveSettings({ contentType: e.target.value as ContentType })
                  }
                  className={inputClass}
                >
                  {availableTypes.map((key) => (
                    <option key={key} value={key}>
                      {CONTENT_TYPES[key].label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-[#006d6e]">
                  {payload.eyebrow || config.eyebrow}
                </span>
              </Row>

              <Row label="Category">
                <input
                  value={payload.category}
                  disabled={locked}
                  onChange={(e) => ctrl.patch({ category: e.target.value })}
                  placeholder={config.category}
                  className={inputClass}
                />
              </Row>

              <Row label="Public URL">
                {permissions.changeSlug ? (
                  <div className="flex gap-1.5">
                    <input
                      value={slugDraft ?? article.slug}
                      onChange={(e) => setSlugDraft(e.target.value)}
                      className={`${inputClass} font-mono text-xs`}
                    />
                    {slugDraft !== null && slugDraft !== article.slug && (
                      <button
                        type="button"
                        onClick={() => void saveSettings({ slug: slugDraft })}
                        className="shrink-0 rounded-lg bg-[#006d6e] px-2.5 text-xs font-semibold text-white"
                      >
                        Set
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="break-all font-mono text-xs text-slate-500">
                    /newsroom/{article.slug}
                  </p>
                )}
                {article.publishedRevisionId && (
                  <span className="mt-1 block text-xs text-slate-400">
                    Live. Changing this breaks existing links.
                  </span>
                )}
              </Row>
            </SettingsCard>

            <SettingsCard title="Hero image">
              <HeroImageField
                value={payload.heroImage}
                articleId={articleId}
                disabled={locked}
                onChange={(heroImage) => ctrl.patch({ heroImage })}
              />
            </SettingsCard>

            <SettingsCard title="Listing &amp; search">
              <Row label="Excerpt">
                <textarea
                  value={payload.excerpt}
                  disabled={locked}
                  rows={3}
                  onChange={(e) => ctrl.patch({ excerpt: e.target.value })}
                  placeholder="One or two sentences for the newsroom card."
                  className={`${inputClass} resize-y`}
                />
              </Row>
              <Row label="Tags">
                <input
                  value={payload.tags.join(", ")}
                  disabled={locked}
                  onChange={(e) =>
                    ctrl.patch({
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="inflation, markets"
                  className={inputClass}
                />
              </Row>
              <Row label="SEO title">
                <input
                  value={payload.seoTitle}
                  disabled={locked}
                  onChange={(e) => ctrl.patch({ seoTitle: e.target.value })}
                  placeholder="Falls back to the headline"
                  className={inputClass}
                />
              </Row>
              <Row label="SEO description">
                <textarea
                  value={payload.seoDescription}
                  disabled={locked}
                  rows={2}
                  onChange={(e) => ctrl.patch({ seoDescription: e.target.value })}
                  placeholder="Falls back to the excerpt"
                  className={`${inputClass} resize-y`}
                />
              </Row>
            </SettingsCard>

            <SettingsCard title="Status">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Reading time</dt>
                  <dd className="text-slate-700">
                    {ctrl.readingTime > 0 ? `${ctrl.readingTime} min` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Last saved</dt>
                  <dd className="text-slate-700">
                    <WhenLabel iso={ctrl.savedAt} withTime />
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Published</dt>
                  <dd className="text-slate-700">
                    <WhenLabel iso={article.publishedAt} />
                  </dd>
                </div>
              </dl>
            </SettingsCard>

            <SettingsCard title="Version history">
              <VersionHistory
                revisions={revisions}
                reviews={ctrl.workspace.reviews}
                articleId={articleId}
                publishedRevisionId={article.publishedRevisionId}
              />
            </SettingsCard>

            {settingsError && <ErrorNotice>{settingsError}</ErrorNotice>}
          </aside>
        </div>
      </div>

      {submitting && (
        <SubmitDialog
          onCancel={() => setSubmitting(false)}
          onConfirm={ctrl.submit}
          onDone={() => setSubmitting(false)}
        />
      )}
    </div>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </div>
  );
}

/** "Saving…" / "Saved" / a reason it did not. Never silence. */
function SaveIndicator({ ctrl }: { ctrl: ReturnType<typeof useArticleDraft> }) {
  if (ctrl.saveState === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (ctrl.saveState === "error") {
    return (
      <span
        title={ctrl.saveError ?? ctrl.conflict ?? undefined}
        className="flex items-center gap-1.5 text-xs font-medium text-rose-600"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Not saved
      </span>
    );
  }
  if (ctrl.saveState === "dirty") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        Unsaved changes
      </span>
    );
  }
  if (ctrl.saveState === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#006d6e]">
        <Check className="h-3.5 w-3.5" />
        Saved
      </span>
    );
  }
  return null;
}
