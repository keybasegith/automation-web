/**
 * Browser-local raw-text extraction from PDFs.
 *
 * The Fundserv summary reports are report layouts (not tables), so — unlike the
 * table reconstruction in net-settlement/parsePdf — we need the plain text with
 * line breaks to feed the summary parsers and the classifier. Scanned/image
 * PDFs have no text layer and are reported as such (no OCR in this phase).
 */

import { PDF_WORKER_URL } from "@/lib/net-settlement/parsePdf";

type PdfjsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: unknown) => { promise: Promise<PdfDocument> };
};
type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
  }>;
};

export interface PdfTextResult {
  text: string;
  pages: number;
  hasText: boolean;
  warnings: string[];
}

async function loadPdfjs(): Promise<PdfjsModule> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsModule;
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  }
  return pdfjs;
}

/**
 * Reconstruct text lines from positioned runs. Items are grouped into rows by
 * their Y coordinate so multi-column report rows stay on one line.
 */
function itemsToText(items: Array<{ str: string; x: number; y: number }>): string {
  const clean = items.filter((i) => i.str.trim() !== "");
  if (clean.length === 0) return "";
  const sorted = [...clean].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Array<Array<{ str: string; x: number; y: number }>> = [];
  for (const item of sorted) {
    const cur = rows[rows.length - 1];
    if (cur && Math.abs(cur[0].y - item.y) <= 3) cur.push(item);
    else rows.push([item]);
  }
  return rows
    .map((row) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str.trim())
        .join("   ")
    )
    .join("\n");
}

export async function extractPdfText(data: ArrayBuffer): Promise<PdfTextResult> {
  let pdfjs: PdfjsModule;
  try {
    pdfjs = await loadPdfjs();
  } catch (err) {
    return {
      text: "",
      pages: 0,
      hasText: false,
      warnings: [`Could not load the PDF reader: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  try {
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(data),
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise;

    const parts: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items = content.items
        .filter((it) => typeof it.str === "string" && it.transform)
        .map((it) => ({ str: it.str as string, x: it.transform![4], y: it.transform![5] }));
      parts.push(itemsToText(items));
    }

    const text = parts.join("\n\n");
    const hasText = text.trim().length > 0;
    return {
      text,
      pages: doc.numPages,
      hasText,
      warnings: hasText
        ? []
        : ["Manual review required: scanned or image-based PDF (no extractable text)."],
    };
  } catch (err) {
    return {
      text: "",
      pages: 0,
      hasText: false,
      warnings: [`Could not read this PDF: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}
