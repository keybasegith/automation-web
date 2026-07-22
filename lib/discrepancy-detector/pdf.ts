/**
 * Local PDF reading. Nothing here touches the network.
 *
 * pdf.js runs entirely in the browser and its worker is served from
 * /public/pdfjs as a same-origin static asset (see PDF_WORKER_URL), so a client
 * PDF is never uploaded anywhere — it is read in the reviewer's own tab.
 *
 * Two extraction paths, in order of reliability:
 *   1. AcroForm field values by field name — exact, when the export is fillable.
 *   2. Positioned text runs — for typed (non-fillable) text PDFs.
 * Scanned/image-only PDFs have no text layer; per spec 5.3 we do not attempt OCR
 * in this version and the reviewer types the fields instead.
 */

/**
 * The worker is served as a static asset rather than resolved by the bundler —
 * bare-specifier asset resolution differs between webpack and Turbopack, and a
 * static URL is deterministic. Mirrors lib/net-settlement/parsePdf.ts.
 *
 * NOTE: public/pdfjs/pdf.worker.min.mjs is copied from
 * node_modules/pdfjs-dist/legacy/build/ by the postinstall script and must be
 * re-copied when pdfjs-dist is upgraded.
 */
export const PDF_WORKER_URL = "/pdfjs/pdf.worker.min.mjs";

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
}

export interface PdfPageText {
  pageNumber: number;
  items: PdfTextItem[];
  text: string;
}

export interface PdfReadResult {
  pageCount: number;
  pages: PdfPageText[];
  /** Flattened AcroForm values, keyed by field name. Empty for non-fillable PDFs. */
  fields: Record<string, string>;
  /** Whole-document text, newline-joined per page. */
  text: string;
  hasTextLayer: boolean;
}

type PdfjsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: unknown) => { promise: Promise<PdfDocument> };
};

type PdfAnnotation = {
  fieldName?: string;
  fieldValue?: unknown;
  fieldType?: string;
  exportValue?: string;
  buttonValue?: string;
};

type PdfPage = {
  getTextContent: () => Promise<{ items: Array<{ str?: string; transform?: number[] }> }>;
  getAnnotations: (opts?: { intent?: string }) => Promise<PdfAnnotation[]>;
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (ctx: unknown) => { promise: Promise<void> };
  cleanup?: () => void;
};

type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy?: () => Promise<void>;
};

async function loadPdfjs(): Promise<PdfjsModule> {
  // The legacy build runs in both the browser and Node (used by tests).
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsModule;
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  }
  return pdfjs;
}

/** Reconstruct reading-order text from positioned runs, one line per Y band. */
export function itemsToText(items: PdfTextItem[], rowTol = 3): string {
  const clean = items.filter((i) => i.str.trim() !== "");
  if (clean.length === 0) return "";

  const sorted = [...clean].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfTextItem[][] = [];
  for (const item of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(current[0].y - item.y) <= rowTol) current.push(item);
    else rows.push([item]);
  }
  return rows
    .map((row) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str.trim())
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}

/** Normalize an AcroForm value to a string. Checkboxes arrive as "Off"/export values. */
function annotationValue(a: PdfAnnotation): string {
  const raw = a.fieldValue;
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "boolean") return raw ? "on" : "";
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean).join(", ");
  return String(raw).trim();
}

export async function readPdf(data: ArrayBuffer): Promise<PdfReadResult> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: true,
    // Defence in depth: these forms are third-party PDFs opened by a compliance
    // reviewer, so we do not let embedded scripts or fonts execute.
    isEvalSupported: false,
  }).promise;

  const pages: PdfPageText[] = [];
  const fields: Record<string, string> = {};

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);

    const content = await page.getTextContent();
    const items: PdfTextItem[] = content.items
      .filter((it) => typeof it.str === "string" && Array.isArray(it.transform))
      .map((it) => ({ str: it.str as string, x: it.transform![4], y: it.transform![5] }));
    pages.push({ pageNumber: p, items, text: itemsToText(items) });

    try {
      for (const a of await page.getAnnotations({ intent: "any" })) {
        if (!a.fieldName) continue;
        const value = annotationValue(a);
        // Radio groups repeat the field name across kids; keep the checked one.
        if (value && value.toLowerCase() !== "off") fields[a.fieldName] = value;
        else if (!(a.fieldName in fields)) fields[a.fieldName] = "";
      }
    } catch {
      // Not a fillable form, or annotations unreadable — the text layer path still applies.
    }
  }

  await doc.destroy?.();

  const text = pages.map((p) => p.text).join("\n");
  return {
    pageCount: pages.length,
    pages,
    fields,
    text,
    hasTextLayer: text.trim().length > 0,
  };
}

/**
 * Rasterize each page to a PNG data URL for the verification screen.
 *
 * Browser-only (needs a canvas) and local — no external rendering service.
 * Rendered at `scale` for legibility on the two-pane screen.
 */
export async function renderPageImages(
  data: ArrayBuffer,
  scale = 1.6
): Promise<string[]> {
  if (typeof document === "undefined") return [];

  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  const images: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    images.push(canvas.toDataURL("image/png"));
    page.cleanup?.();
  }

  await doc.destroy?.();
  return images;
}
