"use client";

import type { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  /** Text items that fall in the top 15% of the page (by Y coordinate). */
  headerText: string;
  /** Text items that fall in the bottom 15% of the page. */
  footerText: string;
}

const HEADER_FOOTER_BAND = 0.15;

let workerConfigured = false;

async function ensurePdfJs() {
  // Lazy import — pdfjs-dist is large and only needed in the browser.
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    // Worker is served as a static asset from public/. Keep these in sync if
    // the pdfjs-dist version is upgraded:
    //   cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerConfigured = true;
  }
  return pdfjs;
}

function isTextItem(item: TextItem | unknown): item is TextItem {
  return !!item && typeof (item as TextItem).str === "string";
}

/**
 * Extract text content from each page of a PDF.
 *
 * Pages that are scanned/image-only will return an empty (or near-empty)
 * string. The caller's classifier will mark those as "Needs OCR Review".
 */
export async function extractPdfPageText(args: {
  bytes: ArrayBuffer | Uint8Array;
  onPageProgress?: (pageNumber: number, totalPages: number) => void;
}): Promise<ExtractedPage[]> {
  const pdfjs = await ensurePdfJs();

  // Clone bytes to avoid pdfjs detaching the caller's buffer.
  const inputBytes =
    args.bytes instanceof Uint8Array
      ? new Uint8Array(args.bytes)
      : new Uint8Array(args.bytes.slice(0));

  const loadingTask = pdfjs.getDocument({
    data: inputBytes,
    disableFontFace: true,
  });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  const pages: ExtractedPage[] = [];
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;
    const headerThreshold = pageHeight * (1 - HEADER_FOOTER_BAND);
    const footerThreshold = pageHeight * HEADER_FOOTER_BAND;

    const content: TextContent = await page.getTextContent();
    const items = content.items.filter(isTextItem);

    const allParts: string[] = [];
    const headerParts: string[] = [];
    const footerParts: string[] = [];

    for (const item of items) {
      // PDF coords: origin bottom-left. transform[5] is the y position.
      const y =
        Array.isArray(item.transform) && item.transform.length >= 6
          ? Number(item.transform[5])
          : NaN;
      allParts.push(item.str);
      if (Number.isFinite(y)) {
        if (y >= headerThreshold) headerParts.push(item.str);
        else if (y <= footerThreshold) footerParts.push(item.str);
      }
    }

    const flatten = (parts: string[]) =>
      parts.join(" ").replace(/\s+/g, " ").trim();

    pages.push({
      pageNumber,
      text: flatten(allParts),
      headerText: flatten(headerParts),
      footerText: flatten(footerParts),
    });
    if (args.onPageProgress) args.onPageProgress(pageNumber, totalPages);
    page.cleanup();
  }

  await pdf.destroy();
  return pages;
}
