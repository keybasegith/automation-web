"use client";

/**
 * The left half of the verification screen: the source document itself.
 *
 * Page images are rasterized locally by pdf.js into data: URLs, so nothing is
 * uploaded and no remote image is ever requested. The reviewer reads the real
 * form here and confirms the fields on the right against it.
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Pill } from "./ui";

export default function DocumentPane({
  title,
  fileName,
  images,
  mode,
  warnings,
}: {
  title: string;
  fileName: string;
  images: string[];
  mode: "parsed" | "manual";
  warnings: string[];
}) {
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);

  const clampPage = (n: number) => Math.max(0, Math.min(images.length - 1, n));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold tracking-tight text-slate-900">{title}</h3>
          <Pill tone={mode === "parsed" ? "ok" : "manual"}>
            {mode === "parsed" ? "Text layer read" : "Manual entry"}
          </Pill>
        </div>
        <p className="max-w-[16rem] truncate text-[11px] text-slate-400" title={fileName}>
          {fileName}
        </p>
      </div>

      {warnings.map((w) => (
        <p
          key={w}
          className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900"
        >
          {w}
        </p>
      ))}

      {images.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[12px] text-slate-400">
          Page preview unavailable.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(clampPage(page - 1))}
                disabled={page === 0}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[4.5rem] text-center text-[11px] tabular-nums text-slate-500">
                Page {page + 1} of {images.length}
              </span>
              <button
                type="button"
                onClick={() => setPage(clampPage(page + 1))}
                disabled={page === images.length - 1}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="w-9 text-center text-[11px] tabular-nums text-slate-500">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-16rem)] overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-2">
            {/*
              A plain <img> rather than next/image: the source is a local data:
              URL produced in this tab, so there is nothing for the image
              optimizer to fetch or cache.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[page]}
              alt={`${title} page ${page + 1}`}
              style={{ width: `${zoom * 100}%` }}
              className="mx-auto rounded shadow-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}
