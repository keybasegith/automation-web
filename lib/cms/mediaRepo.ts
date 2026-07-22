import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { sanitizeFileName } from "@/lib/cms/validation";
import type { MediaItem } from "@/lib/cms/types";

/**
 * File-backed media library. Uploaded images are stored under
 * `public/media/` (so Next serves them directly) and their metadata in
 * `data/cms-media.json`. Filenames are sanitized and made unique to prevent
 * collisions and path traversal.
 */

const MEDIA_INDEX = path.join(process.cwd(), "data", "cms-media.json");
const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const URL_PREFIX = "/media";

export const MEDIA_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
export const MEDIA_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

async function readIndex(): Promise<MediaItem[]> {
  try {
    const raw = await fs.readFile(MEDIA_INDEX, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as MediaItem[];
  } catch {
    // Missing index → empty library.
  }
  return [];
}

async function writeIndex(items: MediaItem[]): Promise<void> {
  await fs.mkdir(path.dirname(MEDIA_INDEX), { recursive: true });
  const tmp = `${MEDIA_INDEX}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
  await fs.rename(tmp, MEDIA_INDEX);
}

export async function listMedia(): Promise<MediaItem[]> {
  const items = await readIndex();
  return items.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

export async function saveMedia(args: {
  fileName: string;
  fileType: string;
  bytes: Buffer;
  uploadedBy: string;
}): Promise<MediaItem> {
  await fs.mkdir(MEDIA_DIR, { recursive: true });

  const safe = sanitizeFileName(args.fileName || "image");
  const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
  // Resolve + guard against writing outside the media directory.
  const target = path.join(MEDIA_DIR, storedName);
  if (!target.startsWith(MEDIA_DIR + path.sep)) {
    throw new Error("Invalid file path.");
  }
  await fs.writeFile(target, args.bytes);

  const item: MediaItem = {
    id: randomUUID(),
    fileName: storedName,
    fileUrl: `${URL_PREFIX}/${storedName}`,
    fileType: args.fileType,
    fileSize: args.bytes.byteLength,
    altText: "",
    uploadedBy: args.uploadedBy,
    uploadedAt: new Date().toISOString(),
  };

  const items = await readIndex();
  await writeIndex([item, ...items]);
  return item;
}

export async function updateMediaAlt(id: string, altText: string): Promise<MediaItem | null> {
  const items = await readIndex();
  const idx = items.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], altText };
  await writeIndex(items);
  return items[idx];
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  const items = await readIndex();
  return items.find((m) => m.id === id) ?? null;
}

export async function deleteMedia(id: string): Promise<void> {
  const items = await readIndex();
  const item = items.find((m) => m.id === id);
  if (!item) return;

  // Remove the file, then the index entry. Ignore a missing file.
  const target = path.join(MEDIA_DIR, path.basename(item.fileName));
  try {
    await fs.unlink(target);
  } catch {
    // already gone
  }
  await writeIndex(items.filter((m) => m.id !== id));
}
