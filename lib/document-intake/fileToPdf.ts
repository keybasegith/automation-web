"use client";

import { PDFDocument } from "pdf-lib";

/**
 * Convert any supported file (PDF or image) into a PDF File suitable for
 * uploading to /api/documents/merge.
 *
 * - `application/pdf` → returned as-is when pdf-lib can read it. PDFs that
 *   carry encryption flags (permission-restricted CRA / bank / certificate
 *   exports) are rasterized via pdfjs-dist into a fresh image-based PDF so
 *   pdf-lib's merge step can copy the pages without tripping on still-
 *   encrypted page dictionaries.
 * - `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/bmp` → drawn
 *   onto a one-page PDF sized to the image's natural pixel dimensions
 *   (re-encoded as JPEG; pdf-lib only supports JPEG/PNG for embedding).
 * - `image/heic`, `image/heif` → first decoded to JPEG via heic2any, then
 *   embedded.
 *
 * The whole pipeline runs in the browser — no upload happens during
 * conversion. The returned File has `.pdf` extension and `application/pdf`
 * MIME type so the merge panel and route can treat it uniformly.
 */
export async function convertFileToPdf(file: File): Promise<File> {
  const lowerName = file.name.toLowerCase();
  const isPdf =
    file.type === "application/pdf" || lowerName.endsWith(".pdf");
  if (isPdf) return await flattenPdfIfNeeded(file);

  const looksHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif");

  let imageBlob: Blob = file;
  if (looksHeic) {
    imageBlob = await convertHeicToJpeg(file);
  } else if (!file.type.startsWith("image/") && !looksImageByExtension(lowerName)) {
    throw new Error(
      `${file.name}: only PDFs and image files (JPG, PNG, HEIC, WebP, GIF, BMP) are supported.`
    );
  }

  // Decode the image (browser handles JPEG/PNG/WebP/GIF/BMP natively; HEIC was
  // already converted to JPEG above) and re-encode as JPEG so pdf-lib can
  // embed it. JPEG keeps file size predictable; alpha is flattened to white.
  const { jpegBytes, width, height } = await rasterizeToJpeg(imageBlob);

  const pdf = await PDFDocument.create();
  const embedded = await pdf.embedJpg(jpegBytes);
  const page = pdf.addPage([width, height]);
  page.drawImage(embedded, { x: 0, y: 0, width, height });
  const bytes = await pdf.save();
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([arrayBuffer], `${baseName}.pdf`, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".heic",
  ".heif",
];

function looksImageByExtension(lowerName: string): boolean {
  return IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

async function convertHeicToJpeg(file: File): Promise<Blob> {
  // heic2any is browser-only and pulls in libheif WASM. Lazy-import so it
  // never enters the SSR bundle and only loads when a HEIC actually appears.
  const mod = await import("heic2any");
  const heic2any = (mod.default ?? mod) as (opts: {
    blob: Blob;
    toType?: string;
    quality?: number;
  }) => Promise<Blob | Blob[]>;
  const out = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  return Array.isArray(out) ? out[0] : out;
}

interface RasterizedImage {
  jpegBytes: Uint8Array;
  width: number;
  height: number;
}

async function rasterizeToJpeg(blob: Blob): Promise<RasterizedImage> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not acquire 2D canvas context for image conversion.");
    }
    // Flatten any alpha to white so JPEG (which has no alpha channel) doesn't
    // produce a black background where the source was transparent.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const jpegBytes = await canvasToJpegBytes(canvas);
    return {
      jpegBytes,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          "Browser could not decode this image. If it's HEIC, the conversion step may have failed."
        )
      );
    img.src = src;
  });
}

async function canvasToJpegBytes(
  canvas: HTMLCanvasElement
): Promise<Uint8Array> {
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
  );
  if (!blob) {
    throw new Error("Canvas could not produce a JPEG blob.");
  }
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * If the PDF can be loaded by pdf-lib without ignoreEncryption, it's a clean
 * file — return it as-is. If it carries encryption flags (permission-only or
 * actually encrypted streams), rasterize every page via pdfjs-dist into a
 * fresh image-based PDF that pdf-lib can definitely merge.
 *
 * pdfjs-dist is more permissive about reading "encrypted" PDFs whose owner
 * password is empty — which is the common shape of CRA / bank / certificate
 * exports where only print/copy permissions are restricted.
 */
async function flattenPdfIfNeeded(file: File): Promise<File> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
    // Plain PDF — pass through.
    return file;
  } catch (err) {
    if (!/encrypt/i.test(String(err))) {
      // A different parse error — let it bubble up so the user sees it.
      throw new Error(
        `${file.name}: could not read PDF — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  const flattenedBytes = await rasterizePdfToImagePdf(arrayBuffer, file.name);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([flattenedBytes as unknown as BlobPart], `${baseName}.pdf`, {
    type: "application/pdf",
    lastModified: Date.now(),
  });
}

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

async function rasterizePdfToImagePdf(
  bytes: ArrayBuffer,
  label: string
): Promise<Uint8Array> {
  const pdfjs = await ensurePdfJs();
  // Clone bytes — pdfjs detaches its input buffer.
  const inputBytes = new Uint8Array(bytes.slice(0));
  const loadingTask = pdfjs.getDocument({
    data: inputBytes,
    disableFontFace: true,
    // pdfjs handles the empty-owner-password case automatically; passing an
    // empty string nudges it past PDFs that nominally require a password but
    // were saved with no actual password set.
    password: "",
  });
  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (err) {
    throw new Error(
      `${label}: this PDF is password-protected and cannot be merged. Please remove the password and re-upload.${
        err instanceof Error ? ` (${err.message})` : ""
      }`
    );
  }

  const out = await PDFDocument.create();
  const totalPages = pdf.numPages;
  const scale = 2;

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not acquire 2D canvas context for PDF flattening.");
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    } as unknown as Parameters<typeof page.render>[0]).promise;
    const jpegBytes = await canvasToJpegBytes(canvas);
    const embedded = await out.embedJpg(jpegBytes);
    // Use the original page dimensions (un-scaled) so the output PDF keeps
    // the source's physical page size — important for forms that get printed.
    const baseViewport = page.getViewport({ scale: 1 });
    const newPage = out.addPage([baseViewport.width, baseViewport.height]);
    newPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: baseViewport.width,
      height: baseViewport.height,
    });
    page.cleanup();
  }

  await pdf.destroy();
  return await out.save();
}
