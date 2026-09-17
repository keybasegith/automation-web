"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_KEYS,
  type ContentRole,
  type ContentType,
} from "@/lib/content/types";
import { ErrorNotice, buttonPrimary, buttonSecondary, inputClass } from "./ui";

/**
 * The only thing standing between "New Article" and writing: what kind of piece
 * this is, and a working title.
 *
 * Everything else — category, eyebrow, byline, disclosure — follows from the
 * content type and can be adjusted in the editor. Asking for it up front would
 * be a database form, which is exactly what this is not meant to feel like.
 */
export default function NewArticleDialog({
  viewerRole,
  onClose,
}: {
  viewerRole: ContentRole;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);

  // An advisor writes under their own name; the corporate voice is not theirs
  // to use. The server enforces this too — this only shapes what is offered.
  const available = CONTENT_TYPE_KEYS.filter((key) =>
    viewerRole === "admin" ? true : CONTENT_TYPES[key].advisorAuthored
  );

  const [type, setType] = useState<ContentType>(available[0]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/content/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: type, title: title.trim() }),
      });
      if (res.status === 401) {
        window.location.href = "/content";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create the article.");
      router.push(`/content/articles/${data.article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the article.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-article-heading"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="new-article-heading"
            className="text-lg font-semibold text-slate-900"
          >
            New article
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-slate-700">
            Content type
          </legend>
          <div className="space-y-2">
            {available.map((key) => {
              const config = CONTENT_TYPES[key];
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                    type === key
                      ? "border-[#006d6e] bg-[#006d6e]/5"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="contentType"
                    value={key}
                    checked={type === key}
                    onChange={() => setType(key)}
                    className="mt-1 accent-[#006d6e]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">
                      {config.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {config.description}
                    </span>
                    <span className="mt-1.5 block font-mono text-[11px] uppercase tracking-wider text-[#006d6e]">
                      {config.eyebrow}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <label
            htmlFor="new-article-title"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Working title
          </label>
          <input
            id="new-article-title"
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What Canada's latest inflation data could mean for long-term investors"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-400">
            The public URL is generated from this once, and then stays put — a
            later rewrite of the headline will not move a live page.
          </p>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorNotice>{error}</ErrorNotice>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={buttonPrimary}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Creating…" : "Create draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
