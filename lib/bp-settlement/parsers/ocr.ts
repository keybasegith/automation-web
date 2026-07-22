"use client";

/**
 * On-device OCR for screenshot uploads (spec allows PDF / Excel / CSV / image).
 *
 * Uses tesseract.js — the same LOCAL OCR library already used elsewhere in the
 * app (lib/document-intake/ocrPage.ts). Recognition runs entirely in the
 * browser; no document bytes are sent to any external OCR service. Because OCR
 * can misread digits, extracted values carry lower confidence and the UI warns
 * the operator to verify them against the source file.
 *
 * The English language data (~10–15 MB) is fetched once on first use and the
 * worker is reused for subsequent images.
 */

type TesseractWorker = {
  recognize: (image: Blob | string) => Promise<{ data: { text?: string; confidence?: number } }>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return (await createWorker("eng")) as unknown as TesseractWorker;
    })();
  }
  return workerPromise;
}

export interface OcrResult {
  text: string;
  confidence: number; // 0..1
  warnings: string[];
}

export async function extractImageText(bytes: ArrayBuffer): Promise<OcrResult> {
  try {
    const worker = await getWorker();
    const blob = new Blob([bytes]);
    const { data } = await worker.recognize(blob);
    const text = data.text ?? "";
    return {
      text,
      confidence: Math.max(0, Math.min(1, (data.confidence ?? 0) / 100)),
      warnings: text.trim() ? [] : ["No text could be read from this image."],
    };
  } catch (err) {
    return {
      text: "",
      confidence: 0,
      warnings: [`On-device OCR failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}
