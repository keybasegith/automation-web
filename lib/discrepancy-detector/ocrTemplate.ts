"use client";

/**
 * Reading a FLATTENED form — spec 5.3, revised.
 *
 * The submissions this tool actually receives are flattened: the advisor fills
 * the fillable form, exports it flat, and every entered value becomes part of
 * the page image. Such a file has no AcroForm fields at all and its text layer
 * carries only the printed boilerplate, so the field-name extraction in
 * ./extract finds nothing however well it is written.
 *
 * OCR alone would be a poor answer — reading a whole page and guessing which
 * run of text is the client's surname is exactly the kind of guess this tool
 * refuses to make. But we do not have to guess. The BLANK fillable form is
 * committed to /public, its AcroForm widgets carry the exact rectangle of every
 * box on the page, and a flattened export of that same form shares its
 * coordinate system (both are 612x792). So the blank form is used as a
 * TEMPLATE: for each field we care about, crop that rectangle out of the
 * rendered page and read only that box.
 *
 * Two consequences worth stating plainly:
 *
 *  - Accuracy is far higher than page-level OCR, because Tesseract is handed a
 *    small isolated image containing one value, and because a result is never
 *    matched to a field by proximity — it IS the field, by construction.
 *
 *  - CHECKBOXES ARE NOT READ. Everything here is a text box. Which of six time
 *    horizons is ticked, or which of eight income bands, is left for the
 *    reviewer. A misread name is obvious to anyone glancing at the page image;
 *    a wrong tick among six near-identical boxes is not, and it would flip the
 *    outcome of X2, X3 or N8 without ever looking wrong.
 */

import type { FieldSource } from "./types";
import type { DocKind } from "./vocab";

/** Where one field sits on the blank form. PDF user-space, origin bottom-left. */
export interface FieldBox {
  page: number;
  rect: readonly [number, number, number, number];
}

export type FieldBoxes = Record<string, FieldBox>;

export interface OcrValue {
  text: string;
  /** Tesseract's 0-100 confidence for the crop. */
  confidence: number;
}

/**
 * Crop this far INSIDE each rectangle, in points.
 *
 * Measured, not guessed: at 0 the crop catches the neighbouring row's
 * descenders ("Rosalind )" instead of "Rosalind"), and at 2 it starts clipping the
 * value's own first character ("_8V2P5" instead of "K1A0B1"). 1 was the best of
 * the three across every field on a real submission.
 */
const CROP_INSET_PT = 1;

/**
 * Render at 4x. OCR accuracy on these small boxes falls off sharply below 3x,
 * and the crops are small enough that the memory cost of 4x is irrelevant.
 */
const RENDER_SCALE = 4;

/**
 * Below this, a value is dropped rather than pre-filled. Tesseract reports low
 * confidence on empty and on genuinely ambiguous crops alike, and both are
 * better left blank for the reviewer than filled in with a plausible mistake.
 */
const MIN_CONFIDENCE = 60;

type PdfjsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: unknown) => { promise: Promise<PdfDocument> };
};
type PdfPage = {
  getAnnotations: (opts?: { intent?: string }) => Promise<
    Array<{ fieldName?: string; rect?: number[] }>
  >;
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
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as unknown as PdfjsModule;
  if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  }
  return pdfjs;
}

/**
 * Read every field rectangle out of a blank fillable form.
 *
 * Fetched same-origin from the app's own static assets: the template is a blank
 * form, so nothing about the client's document leaves this tab.
 */
export async function loadFieldBoxes(blankFormUrl: string): Promise<FieldBoxes> {
  const res = await fetch(blankFormUrl, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`Could not load the blank form template (${res.status}).`);
  }
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await res.arrayBuffer()),
    isEvalSupported: false,
  }).promise;

  const boxes: FieldBoxes = {};
  for (let page = 1; page <= doc.numPages; page++) {
    const pg = await doc.getPage(page);
    for (const a of await pg.getAnnotations({ intent: "any" })) {
      if (!a.fieldName || !a.rect || a.rect.length < 4) continue;
      // First widget wins: a field repeated across pages is anchored to the
      // first place it appears, which is where a value would be typed.
      if (a.fieldName in boxes) continue;
      boxes[a.fieldName] = {
        page,
        rect: [a.rect[0], a.rect[1], a.rect[2], a.rect[3]] as const,
      };
    }
    pg.cleanup?.();
  }
  await doc.destroy?.();
  return boxes;
}

/** How a field's raw OCR text should be tidied before anyone sees it. */
export type FieldShape = "text" | "code" | "number";

/**
 * Strip what the crop caught that the box did not contain.
 *
 * A widget rectangle is often a little wider than the ink it holds, so a value
 * can arrive with a fragment of the printed label beside it ("Grace Palmer Sig;")
 * or a piece of a rule line ("9744 |"). Cleaning is deliberately conservative —
 * it removes punctuation noise, never words — because the reviewer confirms
 * every value anyway and silently deleting a real name would be worse than
 * leaving a stray character.
 */
export function cleanOcrText(raw: string, shape: FieldShape): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";

  if (shape === "number") {
    const digits = collapsed.replace(/[^0-9.]/g, "");
    return digits;
  }
  if (shape === "code") {
    // Codes are alphanumeric with the odd dash or slash; anything else is noise.
    return collapsed.replace(/[^A-Za-z0-9\-/]/g, "").trim();
  }
  // Free text: drop leading and trailing punctuation runs, then peel off one
  // trailing scrap if it is clearly not part of the value.
  let out = collapsed.replace(/^[^\w(]+/, "").replace(/[^\w).]+$/, "");
  const parts = out.split(" ");
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (isTrailingNoise(last)) out = parts.slice(0, -1).join(" ");
  }
  return out.trim();
}

/**
 * Words printed immediately to the right of an entry box on these forms. A
 * widget rectangle that runs a little wide catches the start of one, which is
 * how "Advisor's Name: ______ Signature:" comes back as "Grace Palmer Sig".
 *
 * Matched as a prefix so a clipped fragment counts, and only ever applied to the
 * LAST token, so a legitimate value containing one of these words survives.
 */
const TRAILING_LABEL_FRAGMENTS = [
  "signature",
  "sign",
  "date",
  "initials",
  "apt",
  "prov",
  "postal",
];

function isTrailingNoise(token: string): boolean {
  const t = token.toLowerCase();
  // A lone trailing lowercase letter is a stray mark, not an initial — initials
  // are capitalised on these forms.
  if (token.length === 1 && /[a-z]/.test(token)) return true;
  // Punctuation-bearing scraps: a rule line or a clipped label.
  if (token.length <= 4 && /[^\w]/.test(token)) return true;
  // The start of a printed label sitting beside the box.
  return TRAILING_LABEL_FRAGMENTS.some(
    (label) => label.startsWith(t) && t.length >= 3
  );
}

export interface OcrRequest {
  /** The flattened document, as uploaded. */
  bytes: ArrayBuffer;
  boxes: FieldBoxes;
  /** Field names to read, and how to tidy each. */
  fields: ReadonlyArray<{ name: string; shape: FieldShape }>;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

/**
 * Read the requested boxes out of a flattened document.
 *
 * Returns a map keyed by AcroForm field name — the same shape `readPdf`
 * produces for a fillable form — so the extraction rules in ./extract consume
 * an OCR'd document through exactly the same code path as a fillable one.
 */
export async function ocrFieldsFromTemplate(
  req: OcrRequest
): Promise<Record<string, OcrValue>> {
  if (typeof document === "undefined") return {};

  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(req.bytes.slice(0)),
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;

  // Only render the pages that actually carry a requested field.
  const wantedPages = new Set<number>();
  for (const f of req.fields) {
    const box = req.boxes[f.name];
    if (box) wantedPages.add(box.page);
  }

  const pages = new Map<number, HTMLCanvasElement>();
  for (const p of wantedPages) {
    if (p > doc.numPages) continue;
    const pg = await doc.getPage(p);
    const viewport = pg.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await pg.render({ canvasContext: ctx, viewport, canvas }).promise;
    pages.set(p, canvas);
    pg.cleanup?.();
  }
  await doc.destroy?.();

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  const out: Record<string, OcrValue> = {};

  try {
    let done = 0;
    for (const { name, shape } of req.fields) {
      if (req.signal?.aborted) break;
      const box = req.boxes[name];
      const source = box ? pages.get(box.page) : undefined;
      done++;
      req.onProgress?.(done, req.fields.length);
      if (!box || !source) continue;

      const [x1, y1, x2, y2] = box.rect;
      const pageHeightPt = source.height / RENDER_SCALE;
      // PDF space has its origin bottom-left; canvas space top-left.
      const sx = Math.max(0, (Math.min(x1, x2) + CROP_INSET_PT) * RENDER_SCALE);
      const sy = Math.max(0, (pageHeightPt - Math.max(y1, y2) + CROP_INSET_PT) * RENDER_SCALE);
      const sw = Math.max(4, (Math.abs(x2 - x1) - CROP_INSET_PT * 2) * RENDER_SCALE);
      const sh = Math.max(4, (Math.abs(y2 - y1) - CROP_INSET_PT * 2) * RENDER_SCALE);

      const crop = document.createElement("canvas");
      crop.width = Math.ceil(sw);
      crop.height = Math.ceil(sh);
      const g = crop.getContext("2d");
      if (!g) continue;
      // A white ground behind the crop: Tesseract reads dark-on-light, and an
      // untouched canvas is transparent, which it scores as noise.
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, crop.width, crop.height);
      g.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

      const result = await worker.recognize(crop.toDataURL("image/png"));
      const confidence = Math.round(result.data.confidence ?? 0);
      const text = cleanOcrText(result.data.text ?? "", shape);
      if (!text || confidence < MIN_CONFIDENCE) continue;
      out[name] = { text, confidence };
    }
  } finally {
    await worker.terminate();
  }

  return out;
}

/** Flatten to the `Record<string, string>` shape `readPdf` returns. */
export const toFieldMap = (
  values: Record<string, OcrValue>
): Record<string, string> =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.text]));

/** Mark every field this OCR pass filled, so the screen can colour them apart. */
export const OCR_SOURCE: FieldSource = "ocr";

/** Blank fillable form to use as the template, per document kind. */
export const TEMPLATE_URL: Record<DocKind, string> = {
  NAAF: "/form-NAAF.pdf",
  KYC: "/form-KYC.pdf",
};

const PLAN_BANDS = ["Low", "LM", "Medium", "MH", "High"] as const;
const PLAN_BAND_TOKENS = ["l", "lm", "m", "mh", "h"] as const;

/**
 * Every TEXT box on the NAAF / KYC that the rules or the verification screen
 * use. Checkbox fields are deliberately absent — see the note at the top of
 * this file.
 *
 * Built rather than listed so the three plan blocks cannot drift apart, and so
 * the `zper_*` naming quirk (bare on the NAAF's first block, prefixed on the
 * KYC's) is covered by asking for both spellings; the one that is not on the
 * form in hand simply has no rectangle and is skipped.
 */
export function naafOcrFields(): ReadonlyArray<{ name: string; shape: FieldShape }> {
  const fields: Array<{ name: string; shape: FieldShape }> = [
    { name: "CCode", shape: "code" },
    { name: "txtLastName", shape: "text" },
    { name: "txtFirstName", shape: "text" },
    { name: "11Joint_Surname", shape: "text" },
    { name: "11Joint_Name", shape: "text" },
    { name: "txtTotalAsset", shape: "number" },
    { name: "1TrustedContactPersonLastName", shape: "text" },
    { name: "1TrustedContactPersonFirstName", shape: "text" },
    { name: "1TrustedContactPersonCellPhone", shape: "text" },
    { name: "1TrustedContactPersonEmail", shape: "text" },
    { name: "1TrustedContactPersonRelationshipStr", shape: "text" },
    { name: "oba", shape: "text" },
    { name: "txtRepCode", shape: "code" },
    { name: "txtDealerCode", shape: "code" },
    { name: "txtRepNameFL", shape: "text" },
    { name: "sigAdvisor1_1", shape: "text" },
    { name: "sigAdvisorDate1_1", shape: "text" },
  ];

  for (let holder = 1; holder <= 2; holder++) {
    for (const block of [1, 2]) {
      fields.push({ name: `sigClient${holder}_${block}`, shape: "text" });
      fields.push({ name: `sigClientDate${holder}_${block}`, shape: "text" });
    }
  }

  for (let plan = 1; plan <= 3; plan++) {
    fields.push({ name: `${plan}PlanID`, shape: "text" });
    for (let i = 0; i < PLAN_BANDS.length; i++) {
      // Current column.
      fields.push({
        name: `${plan}PRiskTolerence_${PLAN_BANDS[i]}_Per`,
        shape: "number",
      });
      // New column, under both spellings the two forms use.
      const token = PLAN_BAND_TOKENS[i];
      const suffix = plan === 2 ? "_b" : plan === 3 ? "_c" : "";
      fields.push({ name: `${plan}zper_${token}`, shape: "number" });
      if (suffix) {
        fields.push({ name: `${plan}zper_${token}${suffix}`, shape: "number" });
        fields.push({ name: `zper_${token}${suffix}`, shape: "number" });
      } else {
        fields.push({ name: `zper_${token}`, shape: "number" });
      }
    }
  }

  return fields;
}
