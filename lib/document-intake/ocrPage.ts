"use client";

import { createWorker, type Worker } from "tesseract.js";

/**
 * OCR fallback for scanned/image-only PDF pages.
 *
 * The pipeline is:
 *   1. The browser renders each empty page from the source PDF onto a canvas
 *      using pdfjs-dist (the same library already used for text extraction).
 *   2. Tesseract.js reads the canvas's PNG bytes and returns recognised text.
 *
 * The Tesseract worker is created lazily on the first call and reused for the
 * lifetime of the page so subsequent OCR requests don't re-download the
 * English language data (~10-15MB on first run).
 */

let workerPromise: Promise<Worker> | null = null;
let pdfJsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

const ensurePdfJs = (): Promise<typeof import("pdfjs-dist")> => {
  if (!pdfJsPromise) {
    pdfJsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    })();
  }
  return pdfJsPromise;
};

const getOcrWorker = async (): Promise<Worker> => {
  if (!workerPromise) {
    workerPromise = createWorker("eng");
  }
  return workerPromise;
};

/**
 * Tear down the cached Tesseract worker. Useful on logout or when the page is
 * about to unmount and the consumer wants the ~30MB of WASM heap reclaimed.
 */
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const cached = workerPromise;
  workerPromise = null;
  try {
    const worker = await cached;
    await worker.terminate();
  } catch {
    /* swallow — best-effort cleanup */
  }
}

interface RenderedPage {
  pageNumber: number;
  /** Image data URL (`data:image/png;base64,...`). */
  dataUrl: string;
}

/**
 * Render the requested pages of a PDF to PNG data URLs. Scale 2 picks a
 * reasonable balance between OCR fidelity and memory — at higher scales the
 * canvas size grows quadratically and Tesseract gets dramatically slower
 * without much accuracy gain.
 */
async function renderPdfPagesToImages(args: {
  bytes: ArrayBuffer | Uint8Array;
  pageNumbers: readonly number[];
  scale?: number;
  onPageProgress?: (pageNumber: number, total: number) => void;
}): Promise<RenderedPage[]> {
  const pdfjs = await ensurePdfJs();
  const inputBytes =
    args.bytes instanceof Uint8Array
      ? new Uint8Array(args.bytes)
      : new Uint8Array(args.bytes.slice(0));
  const loadingTask = pdfjs.getDocument({
    data: inputBytes,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const scale = args.scale ?? 2;

  const out: RenderedPage[] = [];
  for (let i = 0; i < args.pageNumbers.length; i++) {
    const pageNumber = args.pageNumbers[i];
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not acquire 2D canvas context for OCR rendering.");
    }
    // pdfjs 5.x types accept canvasContext + viewport; the `canvas` field is
    // optional. Cast through unknown to keep this resilient across minor type
    // shifts in pdfjs-dist.
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    } as unknown as Parameters<typeof page.render>[0]).promise;
    const dataUrl = canvas.toDataURL("image/png");
    out.push({ pageNumber, dataUrl });
    page.cleanup();
    args.onPageProgress?.(i + 1, args.pageNumbers.length);
  }
  await pdf.destroy();
  return out;
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
}

/**
 * Run OCR on the specified pages of a PDF. Pages whose recognised text is
 * empty are still returned (with `text: ""`) so the caller can detect
 * "OCR couldn't read anything either" cases.
 */
export async function ocrPdfPages(args: {
  bytes: ArrayBuffer | Uint8Array;
  pageNumbers: readonly number[];
  onPageProgress?: (
    pageNumber: number,
    pagesDone: number,
    totalPages: number
  ) => void;
}): Promise<OcrPageResult[]> {
  if (args.pageNumbers.length === 0) return [];
  const rendered = await renderPdfPagesToImages({
    bytes: args.bytes,
    pageNumbers: args.pageNumbers,
  });
  const worker = await getOcrWorker();
  const results: OcrPageResult[] = [];
  for (let i = 0; i < rendered.length; i++) {
    const { pageNumber, dataUrl } = rendered[i];
    const out = await worker.recognize(dataUrl);
    const text = (out.data.text ?? "").replace(/\s+/g, " ").trim();
    results.push({ pageNumber, text });
    args.onPageProgress?.(pageNumber, i + 1, rendered.length);
  }
  return results;
}
