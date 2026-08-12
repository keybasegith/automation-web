import { sanitizeFileName } from "./splitPdf";
import type { SeparatedDocumentFile } from "./types";
import { createZip, sanitizeFolderName, type ZipEntry } from "./zip";

/**
 * A folder holds every copy of one document type found in the upload.
 *
 * The point of the folder view is that an employee who only needs, say, the
 * KYC Update can grab one archive and get exactly that — including the case
 * where the package contained three separate AIO order requests, which land
 * as three PDFs inside a single "Order / PAC Request AIO" folder.
 */
export interface DocumentFolder {
  /** Stable key for React lists — the raw document name. */
  key: string;
  /** Filesystem-safe folder name used inside the archive. */
  folderName: string;
  category: string;
  files: SeparatedDocumentFile[];
}

/**
 * Group separated files into one folder per document type, preserving the
 * order the documents appeared in the source PDF.
 */
export function buildDocumentFolders(
  files: SeparatedDocumentFile[]
): DocumentFolder[] {
  const byName = new Map<string, DocumentFolder>();

  for (const file of files) {
    const existing = byName.get(file.documentName);
    if (existing) {
      existing.files.push(file);
      continue;
    }
    byName.set(file.documentName, {
      key: file.documentName,
      folderName: sanitizeFolderName(file.documentName),
      category: file.category,
      files: [file],
    });
  }

  return Array.from(byName.values());
}

/**
 * Resolve the archive path for each file in a folder.
 *
 * Two documents of the same type often carry the same auto-generated name
 * (the template only varies by page range, and a reviewer may have edited
 * both to match). Colliding names get a ` (2)`, ` (3)` suffix so no entry is
 * silently dropped by the extractor.
 */
function resolveEntryPaths(
  folderName: string | null,
  files: SeparatedDocumentFile[]
): Array<{ file: SeparatedDocumentFile; path: string }> {
  const used = new Map<string, number>();

  return files.map((file) => {
    const base = sanitizeFileName(file.fileName);
    const seen = used.get(base.toLowerCase()) ?? 0;
    used.set(base.toLowerCase(), seen + 1);

    const name =
      seen === 0 ? base : base.replace(/\.pdf$/i, ` (${seen + 1}).pdf`);
    return { file, path: folderName ? `${folderName}/${name}` : name };
  });
}

async function readBlobUrl(blobUrl: string): Promise<Uint8Array> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Could not read generated PDF (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function toZipEntries(
  resolved: Array<{ file: SeparatedDocumentFile; path: string }>
): Promise<ZipEntry[]> {
  return Promise.all(
    resolved.map(async ({ file, path }) => ({
      path,
      bytes: await readBlobUrl(file.blobUrl),
    }))
  );
}

/**
 * Build a ZIP containing one folder's documents, at the archive root.
 *
 * The employee asked for "just the KYC", so they get the PDFs directly rather
 * than having to click through a redundant one-folder nesting.
 */
export async function zipFolder(folder: DocumentFolder): Promise<Blob> {
  const entries = await toZipEntries(resolveEntryPaths(null, folder.files));
  return createZip(entries);
}

/**
 * Build a ZIP containing every folder, each as a real directory. Folder names
 * that sanitize to the same string are disambiguated so their contents don't
 * merge.
 */
export async function zipAllFolders(
  folders: DocumentFolder[]
): Promise<Blob> {
  const usedFolders = new Map<string, number>();
  const resolved: Array<{ file: SeparatedDocumentFile; path: string }> = [];

  for (const folder of folders) {
    const key = folder.folderName.toLowerCase();
    const seen = usedFolders.get(key) ?? 0;
    usedFolders.set(key, seen + 1);
    const folderName =
      seen === 0 ? folder.folderName : `${folder.folderName} (${seen + 1})`;
    resolved.push(...resolveEntryPaths(folderName, folder.files));
  }

  return createZip(await toZipEntries(resolved));
}

/** Suggest an archive filename, e.g. "Jane Smith - KYC Update.zip". */
export function buildZipFileName(args: {
  clientName: string;
  folderName?: string;
}): string {
  const client = sanitizeFolderName(args.clientName || "Client");
  const suffix = args.folderName
    ? sanitizeFolderName(args.folderName)
    : "Separated Documents";
  return `${client} - ${suffix}.zip`;
}
