import { PDFDocument } from "pdf-lib";
import type { DocumentGroup, SeparatedDocumentFile } from "./types";

/**
 * Sanitize a filename string. Strips characters that are illegal on common
 * filesystems and ensures the file ends with `.pdf`.
 *
 * Spaces are PRESERVED unless the caller explicitly asks for `autoFormat`.
 */
export function sanitizeFileName(
  raw: string,
  opts?: { autoFormat?: boolean }
): string {
  let out = (raw ?? "").replace(/[/\\:*?"<>|]+/g, "");
  if (opts?.autoFormat) out = out.replace(/\s+/g, "_");
  out = out.trim();
  if (out.length === 0) return "document.pdf";
  if (!/\.pdf$/i.test(out)) out += ".pdf";
  return out;
}

/**
 * Split the source PDF bytes into one PDF per group. Honors
 * `group.finalFileName` so manual renames take effect at download time.
 *
 * NOTE (storage): for MVP we only return browser-local blob URLs. TODO:
 * persist the generated files to Supabase storage once an intake bucket is
 * provisioned.
 */
export async function splitPdfIntoGroups(args: {
  sourceBytes: ArrayBuffer | Uint8Array;
  groups: DocumentGroup[];
}): Promise<SeparatedDocumentFile[]> {
  const sourcePdf = await PDFDocument.load(args.sourceBytes, {
    ignoreEncryption: false,
  });
  const totalPages = sourcePdf.getPageCount();

  const results: SeparatedDocumentFile[] = [];

  for (const group of args.groups) {
    const validPageIndexes = group.pageNumbers
      .map((p) => p - 1)
      .filter((idx) => idx >= 0 && idx < totalPages);

    if (validPageIndexes.length === 0) continue;

    const newPdf = await PDFDocument.create();
    const copied = await newPdf.copyPages(sourcePdf, validPageIndexes);
    copied.forEach((page) => newPdf.addPage(page));

    const bytes = await newPdf.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);

    results.push({
      id: group.id,
      fileName: sanitizeFileName(group.finalFileName || group.suggestedFileName),
      documentName: group.documentName,
      documentCode: group.documentCode,
      category: group.category,
      documentType: group.documentType,
      startPage: group.startPage,
      endPage: group.endPage,
      pageCount: validPageIndexes.length,
      blobUrl,
      status: group.status,
    });
  }

  return results;
}
