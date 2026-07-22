"use client";

import { Loader2, Plus, Eye, EyeOff } from "lucide-react";
import type { CareersContent, JobPosting } from "@/lib/cms/types";
import { randomId } from "@/lib/cms/id";
import { required } from "@/lib/cms/validation";
import { useCmsDoc } from "./useCmsDoc";
import { ToastProvider } from "./Toast";
import PublishBar from "./PublishBar";
import LivePagePreview from "./LivePagePreview";
import { Card, RepeaterRow, TextField, TextAreaField, fieldInputClass, moveInArray } from "./fields";

function validateCareers(c: CareersContent): string | null {
  for (const r of c.roles) {
    if (!required(r.title).ok) return "Every position needs a title.";
  }
  return null;
}

const blankRole = (): JobPosting => ({
  id: randomId(),
  title: "",
  department: "",
  location: "",
  type: "Full-time",
  description: "",
  isVisible: true,
});

export default function CareersEditor() {
  return (
    <ToastProvider>
      <Editor />
    </ToastProvider>
  );
}

function Editor() {
  const ctrl = useCmsDoc<CareersContent>("careers");
  const c = ctrl.draft;

  const patchRole = (i: number, p: Partial<JobPosting>) =>
    ctrl.setDraft((prev) => {
      const roles = [...prev.roles];
      roles[i] = { ...roles[i], ...p };
      return { ...prev, roles };
    });

  return (
    <div className="flex min-h-screen flex-col">
      <PublishBar
        controller={ctrl}
        title="Careers"
        subtitle="Post open positions and edit the careers page heading."
        viewLiveHref="/careers"
        validate={validateCareers}
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
              title="Open positions"
              description="Add, edit, reorder, or hide the roles listed on the careers page."
            >
              <div className="space-y-4">
                {c.roles.map((role, i) => (
                  <RepeaterRow
                    key={role.id}
                    index={i}
                    total={c.roles.length}
                    onMove={(dir) => ctrl.setDraft((p) => ({ ...p, roles: moveInArray(p.roles, i, dir) }))}
                    onRemove={() => ctrl.setDraft((p) => ({ ...p, roles: p.roles.filter((_, j) => j !== i) }))}
                  >
                    <div className={role.isVisible ? "" : "opacity-60"}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <input
                          value={role.title}
                          placeholder="Position title"
                          onChange={(e) => patchRole(i, { title: e.target.value })}
                          className={`${fieldInputClass} font-medium`}
                        />
                        <button
                          type="button"
                          title={role.isVisible ? "Hide from website" : "Show on website"}
                          onClick={() => patchRole(i, { isVisible: !role.isVisible })}
                          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-white"
                        >
                          {role.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          value={role.department}
                          placeholder="Department"
                          onChange={(e) => patchRole(i, { department: e.target.value })}
                          className={fieldInputClass}
                        />
                        <input
                          value={role.location}
                          placeholder="Location"
                          onChange={(e) => patchRole(i, { location: e.target.value })}
                          className={fieldInputClass}
                        />
                        <input
                          value={role.type}
                          placeholder="Type (e.g. Full-time)"
                          onChange={(e) => patchRole(i, { type: e.target.value })}
                          className={fieldInputClass}
                        />
                      </div>
                      <textarea
                        value={role.description}
                        placeholder="Short description of the role"
                        onChange={(e) => patchRole(i, { description: e.target.value })}
                        rows={2}
                        className={`${fieldInputClass} mt-2 resize-y leading-relaxed`}
                      />
                    </div>
                  </RepeaterRow>
                ))}
                <button
                  type="button"
                  onClick={() => ctrl.setDraft((p) => ({ ...p, roles: [...p.roles, blankRole()] }))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:border-[#006d6e] hover:text-[#006d6e]"
                >
                  <Plus className="h-4 w-4" /> Add position
                </button>
              </div>
            </Card>
            </div>

            {/* Live preview */}
            <div className="hidden w-[460px] shrink-0 xl:block">
              <div className="sticky top-24">
                <LivePagePreview
                  controller={ctrl}
                  path="/careers"
                  canSave={validateCareers(c) === null}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
