"use client";

import { useEffect, useRef, useState } from "react";

const PDF_WORKER_URL = "/pdfjs/pdf.worker.min.mjs";

type Props = {
  src: string;
};

/**
 * Full-width mobile PDF viewer: every page is rendered to a canvas sized to
 * the viewport width (at device-pixel-ratio resolution so it stays sharp),
 * stacked vertically so the whole document reads as one scrollable flyer.
 */
export default function PdfViewer({ src }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    async function render() {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        }

        const doc = await pdfjs.getDocument(src).promise;
        if (cancelled || !container) return;

        container.replaceChildren();
        const containerWidth =
          container.clientWidth || Math.min(window.innerWidth, 900);
        const dpr = Math.min(window.devicePixelRatio || 1, 3);

        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const scale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale: scale * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";

          await page.render({ canvas, viewport }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }

        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    render();

    // Re-render at the new width on orientation change / resize.
    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setStatus("loading");
        render();
      }, 250);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [src]);

  return (
    <main className="min-h-[100dvh] bg-white">
      {status === "loading" ? (
        <div className="flex min-h-[100dvh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        </div>
      ) : null}
      {status === "error" ? (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-[15px] text-slate-600">
            The flyer could not be displayed here.
          </p>
          <a
            href={src}
            className="rounded-xl bg-black px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            Open the PDF directly
          </a>
        </div>
      ) : null}
      {/* Always laid out (never display:none) so clientWidth is measurable
          while the PDF renders; it is empty until pages are appended. */}
      <div ref={containerRef} className="mx-auto w-full max-w-[900px]" />
    </main>
  );
}
