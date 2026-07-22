"use client";

import { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Upload,
  Loader2,
  ImageOff,
} from "lucide-react";
import type { ExecutiveItem, ExecutivesContent } from "@/lib/cms/types";
import { randomId } from "@/lib/cms/id";
import { useCmsDoc } from "@/components/admin/cms/useCmsDoc";
import { uploadMediaFile } from "@/components/admin/cms/uploadMedia";
import { resolveMediaRef } from "@/lib/cms/media/url";
import { ToastProvider, useToast } from "@/components/admin/cms/Toast";
import PublishBar from "@/components/admin/cms/PublishBar";

/**
 * Visual editor for the Key Executives page. Mirrors the public layout (CEO on
 * top, then rows of three) and edits the CMS `executives` draft in place. Uses
 * the shared draft → publish workflow (Save Draft / Publish / Discard) so edits
 * never hit the live site until published.
 */

const ROW_SIZE = 3;

function blankExec(): ExecutiveItem {
  return {
    id: randomId(),
    name: "",
    title: "",
    lead: "",
    paragraphs: [],
    photoUrl: null,
    photoClass: null,
    comingSoon: false,
    ceoMessage: false,
    href: null,
    isVisible: true,
  };
}

function validateExecs(content: ExecutivesContent): string | null {
  for (let i = 0; i < content.people.length; i++) {
    const p = content.people[i];
    if (!p.name.trim() || !p.title.trim()) {
      return `Everyone needs a name and a title. Check card #${i + 1}.`;
    }
  }
  return null;
}

export default function ExecutivesEditor() {
  return (
    <ToastProvider>
      <Editor />
    </ToastProvider>
  );
}

function Editor() {
  const ctrl = useCmsDoc<ExecutivesContent>("executives");
  const [expanded, setExpanded] = useState<number | null>(null);
  const people = ctrl.draft?.people ?? [];

  const setPeople = (updater: (prev: ExecutiveItem[]) => ExecutiveItem[]) =>
    ctrl.setDraft((prev) => ({ ...prev, people: updater(prev.people) }));

  function update(index: number, patch: Partial<ExecutiveItem>) {
    setPeople((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= people.length) return;
    setPeople((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setExpanded(null);
  }

  function remove(index: number) {
    if (!window.confirm(`Remove ${people[index].name || "this person"} from the page?`)) return;
    setPeople((prev) => prev.filter((_, i) => i !== index));
    setExpanded(null);
  }

  function addExec() {
    setPeople((prev) => [...prev, blankExec()]);
    setExpanded(people.length);
  }

  // CEO alone on top, then rows of three — mirrors the live page.
  const rows: number[][] = [];
  if (people.length > 0) {
    rows.push([0]);
    for (let i = 1; i < people.length; i += ROW_SIZE) {
      rows.push(Array.from({ length: Math.min(ROW_SIZE, people.length - i) }, (_, k) => i + k));
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublishBar
        controller={ctrl}
        title="Key Executives"
        subtitle="Click any name, title, or photo to edit. Changes go live when you publish."
        viewLiveHref="/key-executives"
        validate={validateExecs}
      />

      <div className="flex-1 bg-slate-100 px-4 py-8 sm:px-10 sm:py-10">
        {ctrl.loading ? (
          <div className="flex items-center gap-2 py-24 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading page…
          </div>
        ) : ctrl.loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ctrl.loadError}
          </div>
        ) : (
          <div className="mx-auto max-w-[1180px] rounded-2xl bg-white px-5 py-10 shadow-sm ring-1 ring-black/5 sm:px-12 sm:py-14">
            <p className="mb-1 text-[13px] font-medium uppercase tracking-wide text-[#006d6e]">
              Leadership
            </p>
            <h2 className="mb-10 font-serif text-[34px] font-normal leading-tight text-[#0a1f33] sm:text-[44px]">
              Key Executives
            </h2>

            {people.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                No executives yet. Add the first person below.
              </p>
            ) : (
              <div className="space-y-8 sm:space-y-10">
                {rows.map((row, rowIndex) => (
                  <div key={rowIndex}>
                    <div
                      className={
                        row.length === 1
                          ? "flex justify-center"
                          : "grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-8"
                      }
                    >
                      {row.map((index) => (
                        <ExecCard
                          key={people[index].id}
                          exec={people[index]}
                          index={index}
                          total={people.length}
                          isOpen={expanded === index}
                          onToggle={() => setExpanded(expanded === index ? null : index)}
                          onChange={(patch) => update(index, patch)}
                          onMove={(dir) => move(index, dir)}
                          onRemove={() => remove(index)}
                        />
                      ))}
                    </div>

                    {row.includes(expanded ?? -1) && (
                      <BioEditor
                        exec={people[expanded!]}
                        onChange={(patch) => update(expanded!, patch)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addExec}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-5 text-sm font-medium text-slate-500 transition hover:border-[#006d6e] hover:text-[#006d6e]"
            >
              <Plus className="h-4 w-4" />
              Add Executive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One portrait card with inline-editable name/title/photo + hover controls
// ---------------------------------------------------------------------------
function ExecCard({
  exec,
  index,
  total,
  isOpen,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  exec: ExecutiveItem;
  index: number;
  total: number;
  isOpen: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ExecutiveItem>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function upload(file: File) {
    setUploading(true);
    try {
      // Content stores the object-storage KEY; URLs are attached at render.
      const item = await uploadMediaFile(file);
      onChange({ photoUrl: item.fileKey, comingSoon: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className={`group relative mx-auto w-full max-w-[230px] rounded-xl p-2 transition ${
        exec.isVisible ? "" : "opacity-55"
      } ${isOpen ? "ring-2 ring-[#006d6e]/40" : "hover:bg-slate-50"}`}
    >
      {/* Hover controls */}
      <div className="absolute right-1 top-1 z-10 flex items-center gap-0.5 rounded-lg bg-white/95 p-0.5 opacity-0 shadow-sm ring-1 ring-black/5 transition group-hover:opacity-100">
        <IconBtn title="Move earlier" onClick={() => onMove(-1)} disabled={index === 0}>
          <ArrowLeft className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn title="Move later" onClick={() => onMove(1)} disabled={index === total - 1}>
          <ArrowRight className="h-3.5 w-3.5" />
        </IconBtn>
        <IconBtn
          title={exec.isVisible ? "Hide from site" : "Show on site"}
          onClick={() => onChange({ isVisible: !exec.isVisible })}
        >
          {exec.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </IconBtn>
        <IconBtn title="Remove" onClick={onRemove} danger>
          <Trash2 className="h-3.5 w-3.5" />
        </IconBtn>
      </div>

      {!exec.isVisible && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-white">
          Hidden
        </span>
      )}

      {/* Photo */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative block w-full overflow-hidden rounded-md bg-[#eef1f4] ring-1 ring-black/5"
        title="Click to change photo"
      >
        <span className="flex aspect-[6/7] w-full items-center justify-center">
          {exec.comingSoon || !exec.photoUrl ? (
            <span className="flex flex-col items-center gap-1 text-[#9aa3ad]">
              <ImageOff className="h-6 w-6" strokeWidth={1.5} />
              <span className="font-serif text-[13px]">
                {exec.comingSoon ? "Coming Soon" : "Add photo"}
              </span>
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaRef(exec.photoUrl) ?? undefined}
              alt={exec.name}
              className={`h-full w-full object-cover object-top ${exec.photoClass ?? ""}`}
            />
          )}
        </span>
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/55 py-1.5 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploading ? "Uploading…" : exec.photoUrl ? "Replace Image" : "Upload"}
        </span>
      </button>

      {/* Name + title (inline editable) */}
      <input
        value={exec.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Full name"
        aria-label="Full name"
        className="mt-4 w-full rounded-md border border-transparent bg-transparent text-center font-serif text-[18px] text-[#0a1f33] outline-none transition placeholder:text-slate-300 hover:border-slate-200 focus:border-[#006d6e] focus:bg-white sm:text-[20px]"
      />
      <input
        value={exec.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Title / role"
        aria-label="Title or role"
        className="mt-1 w-full rounded-md border border-transparent bg-transparent text-center text-[13px] text-[#5b6573] outline-none transition placeholder:text-slate-300 hover:border-slate-200 focus:border-[#006d6e] focus:bg-white"
      />

      <button
        type="button"
        onClick={onToggle}
        className={`mx-auto mt-2 flex items-center gap-1 text-[12px] font-medium transition ${
          isOpen ? "text-[#006d6e]" : "text-slate-400 hover:text-[#006d6e]"
        }`}
      >
        {isOpen ? "Close bio" : "Edit bio & options"}
        <ChevronDown className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded bio / options editor (drops beneath the person's row)
// ---------------------------------------------------------------------------
function BioEditor({
  exec,
  onChange,
}: {
  exec: ExecutiveItem;
  onChange: (patch: Partial<ExecutiveItem>) => void;
}) {
  return (
    <div className="mt-6 rounded-xl border-t-2 border-[#006d6e] bg-[#f5f6f8] p-5 sm:p-7">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <FieldLabel label="Lead sentence" hint="Bold intro line at the top of the expanded bio.">
            <input
              value={exec.lead}
              onChange={(e) => onChange({ lead: e.target.value })}
              placeholder="Jane Doe is Chief Executive Officer at Keybase Financial Group."
              className={inputClass}
            />
          </FieldLabel>
          <FieldLabel label="Biography" hint="One paragraph per block — separate with a blank line.">
            <textarea
              value={exec.paragraphs.join("\n\n")}
              onChange={(e) =>
                onChange({
                  paragraphs: e.target.value
                    .split(/\n\s*\n/)
                    .map((p) => p.trim())
                    .filter(Boolean),
                })
              }
              rows={6}
              placeholder={"First paragraph…\n\nSecond paragraph…"}
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </FieldLabel>
          <FieldLabel label="Link (optional)" hint="e.g. a business-card page like /businesscard-krissy">
            <input
              value={exec.href ?? ""}
              onChange={(e) => onChange({ href: e.target.value || null })}
              placeholder="/businesscard-name"
              className={inputClass}
            />
          </FieldLabel>
        </div>

        <div className="space-y-3 rounded-lg bg-white p-4 ring-1 ring-black/5">
          <Toggle
            label="Show on website"
            description="Uncheck to hide this person without deleting them."
            checked={exec.isVisible}
            onChange={(v) => onChange({ isVisible: v })}
          />
          <Toggle
            label={'"Coming soon" placeholder'}
            description="Hides the photo and shows a placeholder tile."
            checked={exec.comingSoon}
            onChange={(v) => onChange({ comingSoon: v })}
          />
          <Toggle
            label="CEO message button"
            description='Adds the "Read a message from our CEO" link to the bio.'
            checked={exec.ceoMessage}
            onChange={(v) => onChange({ ceoMessage: v })}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------
const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#006d6e] focus:ring-2 focus:ring-[#006d6e]/15";

function IconBtn({
  children,
  onClick,
  title,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md p-1.5 text-slate-500 transition disabled:opacity-25 ${
        danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function FieldLabel({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          checked ? "bg-[#006d6e]" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="leading-tight">
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-400">{description}</span>}
      </span>
    </label>
  );
}
