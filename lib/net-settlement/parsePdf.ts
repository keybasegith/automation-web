/**
 * In-browser PDF table extraction.
 *
 * Winfund / Fundserv reports are commonly distributed as text-based PDFs, so we
 * reconstruct the table from the positioned text runs pdf.js gives us:
 *   1. cluster text items into rows by their Y coordinate
 *   2. derive column anchors from the X coordinates across the whole page
 *   3. snap each item into its nearest column
 *
 * Scanned/image-only PDFs have no text layer — we say so rather than invent data.
 */

import {
  matrixToSheet,
  dropRepeatedHeaderRows,
  type ParsedFile,
  type ParsedSheet,
} from "./parse";

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
}

/**
 * Turn positioned PDF text runs into a row/column matrix.
 * Pure + deterministic so it can be unit-tested without a PDF.
 */
export function textItemsToMatrix(
  items: PdfTextItem[],
  opts?: { rowTol?: number; colTol?: number }
): string[][] {
  const rowTol = opts?.rowTol ?? 3;
  const colTol = opts?.colTol ?? 12;

  const clean = items.filter((i) => i.str.trim() !== "");
  if (clean.length === 0) return [];

  // Rows: top-to-bottom (PDF Y grows upward), then left-to-right.
  const sorted = [...clean].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: PdfTextItem[][] = [];
  for (const item of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(current[0].y - item.y) <= rowTol) current.push(item);
    else rows.push([item]);
  }
  rows.forEach((r) => r.sort((a, b) => a.x - b.x));

  // Column anchors: cluster every X start position seen on the page.
  const anchors: number[] = [];
  for (const x of clean.map((i) => i.x).sort((a, b) => a - b)) {
    if (anchors.length === 0 || x - anchors[anchors.length - 1] > colTol) anchors.push(x);
  }

  return rows.map((row) => {
    const cells = new Array<string>(anchors.length).fill("");
    for (const item of row) {
      let idx = 0;
      let best = Infinity;
      anchors.forEach((a, i) => {
        const d = Math.abs(a - item.x);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      const text = item.str.trim();
      cells[idx] = cells[idx] ? `${cells[idx]} ${text}` : text;
    }
    return cells;
  });
}

/** Drop columns that are empty across every row (ragged PDF layouts). */
function dropEmptyColumns(matrix: string[][]): string[][] {
  if (matrix.length === 0) return matrix;
  const width = Math.max(...matrix.map((r) => r.length));
  const keep: number[] = [];
  for (let c = 0; c < width; c++) {
    if (matrix.some((r) => (r[c] ?? "").trim() !== "")) keep.push(c);
  }
  return matrix.map((r) => keep.map((c) => r[c] ?? ""));
}

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

/**
 * The worker is served as a static asset from /public/pdfjs rather than resolved
 * by the bundler — bare-specifier asset resolution differs between webpack and
 * Turbopack, and a static URL is deterministic.
 *
 * NOTE: public/pdfjs/pdf.worker.min.mjs is copied from
 * node_modules/pdfjs-dist/legacy/build/ and must be re-copied when pdfjs-dist
 * is upgraded (see the postinstall script in package.json).
 */
export const PDF_WORKER_URL = "/pdfjs/pdf.worker.min.mjs";

async function loadPdfjs(): Promise<PdfjsModule> {
  // The legacy build runs in both the browser and Node (used by tests).
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsModule;
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  }
  return pdfjs;
}

export async function parsePdfBytes(data: ArrayBuffer): Promise<ParsedFile> {
  let pdfjs: PdfjsModule;
  try {
    pdfjs = await loadPdfjs();
  } catch (err) {
    return {
      kind: "pdf",
      sheets: [],
      warnings: [`Could not load the PDF reader: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  try {
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(data),
      useSystemFonts: true,
      isEvalSupported: false,
    }).promise;

    let matrix: string[][] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = content.items
        .filter((it) => typeof it.str === "string" && it.transform)
        .map((it) => ({ str: it.str as string, x: it.transform![4], y: it.transform![5] }));
      matrix = matrix.concat(textItemsToMatrix(items));
    }

    if (matrix.length === 0) {
      return {
        kind: "pdf",
        sheets: [],
        warnings: [
          "This PDF has no selectable text (it looks like a scan), so no table could be extracted. Export the report as Excel or CSV.",
        ],
      };
    }

    // Repeated page headers become duplicate rows in a multi-page report.
    const cleaned = dropEmptyColumns(dropRepeatedHeaderRows(matrix));
    const sheet: ParsedSheet = matrixToSheet("pdf", cleaned);

    if (sheet.headers.length < 2 || sheet.rows.length === 0) {
      return {
        kind: "pdf",
        sheets: [],
        warnings: [
          "No table could be reconstructed from this PDF. If it is a report layout rather than a table, export it as Excel or CSV.",
        ],
      };
    }

    return { kind: "pdf", sheets: [sheet], warnings: [] };
  } catch (err) {
    return {
      kind: "pdf",
      sheets: [],
      warnings: [`Could not read this PDF: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}
