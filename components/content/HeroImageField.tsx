"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { resolveMediaRef } from "@/lib/cms/media/url";
import { MEDIA_ACCEPT_ATTR, validateUpload } from "@/lib/cms/media/policy";
import type { PayloadImage } from "@/lib/content/types";
import { ErrorNotice, inputClass } from "./ui";

/**
 * The article's hero image.
 *
 * Uploads go through the same presign → PUT → complete pipeline the website
 * CMS media library already uses, so there is one object store, one upload
 * policy, and one media table for the whole site. The file body goes straight
 * from the browser to storage and never touches an API route.
 *
 * The stored value is an object-storage KEY, never a URL — the same convention
 * every other CMS image follows, which is what keeps a future CDN change a
 * config change rather than a content migration.
 *
 * Alt text sits next to the image rather than in a settings panel somewhere
 * else, because an image without it cannot be submitted and the moment to write
 * it is the moment you chose the picture.
 */
export default function HeroImageField({
  value,
  onChange,
  articleId,
  disabled = false,
}: {
  value: PayloadImage | null;
  onChange: (next: PayloadImage | null) => void;
  articleId: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = value ? resolveMediaRefSafely(value.key) : null;

  const upload = async (file: File) => {
    const rejection = validateUpload({
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
    });
    if (rejection) {
      setError(rejection);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const presignRes = await fetch("/api/content/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
        }),
      });
      if (presignRes.status === 401) {
        window.location.href = "/content";
        return;
      }
      const presign = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) {
        throw new Error(presign?.error ?? "Could not start the upload.");
      }

      const putRes = await fetch(presign.uploadUrl as string, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      }).catch(() => null);
      if (!putRes || !putRes.ok) {
        throw new Error(
          `The file could not be uploaded to storage${putRes ? ` (HTTP ${putRes.status})` : ""}.`
        );
      }

      const completeRes = await fetch("/api/content/media/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: presign.key,
          fileName: file.name,
          articleId,
        }),
      });
      const complete = await completeRes.json().catch(() => ({}));
      if (!completeRes.ok) throw new Error(complete?.error ?? "Upload failed.");

      // Dimensions are read in the browser, where the file already is — the
      // server would have to decode the image to learn them. The article
      // template falls back to its own reading width when they are absent, so
      // a failed read costs nothing.
      const size = await imageSize(file).catch(() => ({ width: 0, height: 0 }));

      onChange({
        key: complete.item.fileKey as string,
        alt: value?.alt ?? "",
        width: size.width,
        height: size.height,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* A plain img: this is an admin thumbnail of a file on a host that
              is configured by environment variable, so next/image would refuse
              it without a remotePatterns entry that cannot be written. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="h-36 w-full bg-slate-100 object-cover"
          />
          {!disabled && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="text-xs font-medium text-[#006d6e] hover:underline disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 transition hover:border-[#006d6e] hover:text-[#006d6e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" strokeWidth={1.8} />
          )}
          {uploading ? "Uploading…" : "Upload a hero image"}
          <span className="text-xs text-slate-400">
            JPG, PNG, or WEBP — up to 8 MB
          </span>
        </button>
      )}

      {value && (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Alt text
          </span>
          <input
            value={value.alt}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, alt: e.target.value })}
            placeholder="Describe the image for someone who cannot see it"
            className={inputClass}
          />
          {!value.alt && (
            <span className="mt-1 flex items-center gap-1 text-xs text-amber-600">
              <ImageIcon className="h-3 w-3" />
              Required before this article can be submitted.
            </span>
          )}
        </label>
      )}

      {error && (
        <div className="mt-3">
          <ErrorNotice>{error}</ErrorNotice>
        </div>
      )}
    </div>
  );
}

/**
 * Resolving a key needs NEXT_PUBLIC_MEDIA_BASE_URL, which throws when it is
 * unset. In the editor that must show as a missing thumbnail, not a blank
 * screen where an author's article used to be.
 */
function resolveMediaRefSafely(key: string): string | null {
  try {
    return resolveMediaRef(key);
  } catch {
    return null;
  }
}

/** Natural pixel dimensions of a chosen file, read in the browser. */
function imageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image."));
    };
    img.src = url;
  });
}
