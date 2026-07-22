"use client";

import { Loader2, Plus, Eye, EyeOff } from "lucide-react";
import type { NewsArticle, NewsroomContent } from "@/lib/cms/types";
import { randomId } from "@/lib/cms/id";
import { required } from "@/lib/cms/validation";
import { useCmsDoc } from "./useCmsDoc";
import { ToastProvider } from "./Toast";
import PublishBar from "./PublishBar";
import LivePagePreview from "./LivePagePreview";
import { Card, RepeaterRow, TextField, TextAreaField, fieldInputClass, moveInArray } from "./fields";

function validateNewsroom(c: NewsroomContent): string | null {
  for (const a of c.articles) {
    if (!required(a.title).ok) return "Every article needs a title.";
  }
  return null;
}

const blankArticle = (): NewsArticle => ({
  id: randomId(),
  category: "Firm News",
  title: "",
  excerpt: "",
  date: "",
  author: "",
  isVisible: true,
});

export default function NewsroomEditor() {
  return (
    <ToastProvider>
      <Editor />
    </ToastProvider>
  );
}

function Editor() {
  const ctrl = useCmsDoc<NewsroomContent>("newsroom");
  const c = ctrl.draft;

  const patchArticle = (i: number, p: Partial<NewsArticle>) =>
    ctrl.setDraft((prev) => {
      const articles = [...prev.articles];
      articles[i] = { ...articles[i], ...p };
      return { ...prev, articles };
    });

  return (
    <div className="flex min-h-screen flex-col">
      <PublishBar
        controller={ctrl}
        title="Newsroom"
        subtitle="Publish articles and edit the newsroom heading."
        viewLiveHref="/newsroom"
        validate={validateNewsroom}
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
            <Card title="Page heading">
              <div className="grid gap-4">
                <TextField
                  label="Eyebrow"
                  value={c.hero.eyebrow}
                  onChange={(v) => ctrl.setDraft((p) => ({ ...p, hero: { ...p.hero, eyebrow: v } }))}
                />
                <TextField
                  label="Heading"
                  value={c.hero.heading}
                  onChange={(v) => ctrl.setDraft((p) => ({ ...p, hero: { ...p.hero, heading: v } }))}
                />
                <TextAreaField
                  label="Intro"
                  value={c.hero.intro}
                  onChange={(v) => ctrl.setDraft((p) => ({ ...p, hero: { ...p.hero, intro: v } }))}
                  rows={2}
                />
              </div>
            </Card>

            <Card
              title="Articles"
              description="Add, edit, reorder, or hide the articles shown in the newsroom."
            >
              <div className="space-y-4">
                {c.articles.map((article, i) => (
                  <RepeaterRow
                    key={article.id}
                    index={i}
                    total={c.articles.length}
                    onMove={(dir) => ctrl.setDraft((p) => ({ ...p, articles: moveInArray(p.articles, i, dir) }))}
                    onRemove={() => ctrl.setDraft((p) => ({ ...p, articles: p.articles.filter((_, j) => j !== i) }))}
                  >
                    <div className={article.isVisible ? "" : "opacity-60"}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <input
                          value={article.title}
                          placeholder="Article title"
                          onChange={(e) => patchArticle(i, { title: e.target.value })}
                          className={`${fieldInputClass} font-medium`}
                        />
                        <button
                          type="button"
                          title={article.isVisible ? "Hide from website" : "Show on website"}
                          onClick={() => patchArticle(i, { isVisible: !article.isVisible })}
                          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-white"
                        >
                          {article.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          value={article.category}
                          placeholder="Category"
                          onChange={(e) => patchArticle(i, { category: e.target.value })}
                          className={fieldInputClass}
                        />
                        <input
                          value={article.date}
                          placeholder="Date (e.g. 2026.06.22)"
                          onChange={(e) => patchArticle(i, { date: e.target.value })}
                          className={fieldInputClass}
                        />
                        <input
                          value={article.author}
                          placeholder="Author"
                          onChange={(e) => patchArticle(i, { author: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <textarea
                        value={article.excerpt}
                        placeholder="Short summary shown in the list"
                        onChange={(e) => patchArticle(i, { excerpt: e.target.value })}
                        rows={2}
                        className={`${fieldInputClass} mt-2 resize-y leading-relaxed`}
                      />
                    </div>
                  </RepeaterRow>
                ))}
                <button
                  type="button"
                  onClick={() => ctrl.setDraft((p) => ({ ...p, articles: [...p.articles, blankArticle()] }))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-[#006d6e] hover:text-[#006d6e]"
                >
                  <Plus className="h-4 w-4" /> Add article
                </button>
              </div>
            </Card>
            </div>

            {/* Live preview */}
            <div className="hidden w-[460px] shrink-0 xl:block">
              <div className="sticky top-24">
                <LivePagePreview
                  controller={ctrl}
                  path="/newsroom"
                  canSave={validateNewsroom(c) === null}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
