/**
 * Attached files, shown as chips.
 *
 * Two uses: pending files above the composer, where each is removable, and the
 * files that went out with a sent message, where they are not.
 */

import { X } from "lucide-react";

import { extensionLabel, formatBytes } from "@/lib/internal-ai/attachments";

export interface ChipFile {
  id: string;
  name: string;
  sizeBytes: number;
  previewUrl: string | null;
}

function Thumbnail({ file }: { file: ChipFile }) {
  if (file.previewUrl) {
    return (
      // Object URLs for user-selected files; next/image cannot optimise a blob.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file.previewUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-inset ring-black/5"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-semibold tracking-wide text-slate-500"
    >
      {extensionLabel(file.name)}
    </span>
  );
}

export function AttachmentChips({
  files,
  onRemove,
  disabled = false,
  tone = "light",
}: {
  files: readonly ChipFile[];
  onRemove?: (id: string) => void;
  disabled?: boolean;
  /** "onBrand" sits inside a user bubble, where the ground is the brand colour. */
  tone?: "light" | "onBrand";
}) {
  if (files.length === 0) return null;

  const chipClass =
    tone === "onBrand"
      ? "border-white/25 bg-white/10 text-white"
      : "border-[var(--hairline)] bg-white text-slate-900";
  const metaClass = tone === "onBrand" ? "text-white/70" : "text-slate-500";

  return (
    <ul className="flex flex-wrap gap-2">
      {files.map((file) => (
        <li
          key={file.id}
          className={`flex max-w-[15rem] items-center gap-2.5 rounded-xl border px-2.5 py-1.5 ${chipClass}`}
        >
          <Thumbnail file={file} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">{file.name}</p>
            <p className={`text-[11px] ${metaClass}`}>{formatBytes(file.sizeBytes)}</p>
          </div>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              disabled={disabled}
              aria-label={`Remove ${file.name}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
