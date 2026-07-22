import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { CmsDoc, CmsResource, CmsVersion } from "@/lib/cms/types";

/**
 * Generic file-backed store for CMS documents.
 *
 * Each resource is one JSON file under `data/cms/<resource>.json` holding a
 * {@link CmsDoc}: a working `draft`, the live `published` copy, and a trail of
 * previous published `versions`. Writes are atomic (temp file + rename) so a
 * crash mid-write can never corrupt the live content. On first read a document
 * is seeded from the supplied factory and both draft and published start equal
 * — so a freshly installed site already shows the current hardcoded content.
 *
 * This mirrors lib/admin/executivesRepo.ts and needs no external database.
 */

/**
 * Where CMS documents live. Defaults to `<project>/data/cms`; override with
 * CMS_DATA_DIR to relocate runtime content (e.g. a mounted volume, or a temp
 * dir in tests).
 */
function cmsDir(): string {
  const root = process.env.CMS_DATA_DIR;
  return root ? path.join(root, "cms") : path.join(process.cwd(), "data", "cms");
}

/** Cap version history so files can't grow without bound. */
const MAX_VERSIONS = 25;

function fileFor(resource: CmsResource): string {
  return path.join(cmsDir(), `${resource}.json`);
}

function nowIso(): string {
  return new Date().toISOString();
}

async function atomicWrite(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}

/**
 * Read a document, seeding it on first access. The seed becomes both the draft
 * and the initial published copy so the public site renders immediately.
 */
export async function readDoc<T>(
  resource: CmsResource,
  seed: () => T
): Promise<CmsDoc<T>> {
  try {
    const raw = await fs.readFile(fileFor(resource), "utf8");
    const parsed = JSON.parse(raw) as CmsDoc<T>;
    if (parsed && typeof parsed === "object" && "draft" in parsed) {
      return parsed;
    }
  } catch {
    // Missing or unreadable → seed below.
  }

  const seeded = seed();
  const iso = nowIso();
  const doc: CmsDoc<T> = {
    resource,
    draft: seeded,
    published: seeded,
    versions: [],
    draftUpdatedAt: iso,
    draftUpdatedBy: "system (seed)",
    publishedAt: iso,
    publishedBy: "system (seed)",
  };
  await atomicWrite(fileFor(resource), doc);
  return doc;
}

/** The live published content, or the seed if nothing has been published. */
export async function readPublished<T>(
  resource: CmsResource,
  seed: () => T
): Promise<T> {
  const doc = await readDoc(resource, seed);
  return doc.published ?? doc.draft;
}

/** Overwrite the working draft. Does not touch published content. */
export async function saveDraft<T>(
  resource: CmsResource,
  seed: () => T,
  nextDraft: T,
  editedBy: string
): Promise<CmsDoc<T>> {
  const doc = await readDoc(resource, seed);
  doc.draft = nextDraft;
  doc.draftUpdatedAt = nowIso();
  doc.draftUpdatedBy = editedBy;
  await atomicWrite(fileFor(resource), doc);
  return doc;
}

/**
 * Promote the current draft to live. The previously published copy is archived
 * as a version first, so it can be restored later.
 */
export async function publishDraft<T>(
  resource: CmsResource,
  seed: () => T,
  publishedBy: string,
  changeSummary: string
): Promise<CmsDoc<T>> {
  const doc = await readDoc(resource, seed);
  const iso = nowIso();

  if (doc.published !== null) {
    const version: CmsVersion<T> = {
      id: randomUUID(),
      versionNumber: doc.versions.length + 1,
      snapshot: doc.published,
      changeSummary,
      createdBy: doc.publishedBy ?? "unknown",
      createdAt: doc.publishedAt ?? iso,
      isPublishedVersion: true,
    };
    doc.versions = [version, ...doc.versions].slice(0, MAX_VERSIONS);
  }

  doc.published = doc.draft;
  doc.publishedAt = iso;
  doc.publishedBy = publishedBy;
  await atomicWrite(fileFor(resource), doc);
  return doc;
}

/** Throw away draft edits by resetting the draft to the published copy. */
export async function discardDraft<T>(
  resource: CmsResource,
  seed: () => T,
  editedBy: string
): Promise<CmsDoc<T>> {
  const doc = await readDoc(resource, seed);
  if (doc.published !== null) {
    doc.draft = doc.published;
    doc.draftUpdatedAt = nowIso();
    doc.draftUpdatedBy = editedBy;
    await atomicWrite(fileFor(resource), doc);
  }
  return doc;
}

/**
 * Load a previous version back into the draft. This never changes the live
 * site — the restored content must be published separately.
 */
export async function restoreVersion<T>(
  resource: CmsResource,
  seed: () => T,
  versionId: string,
  editedBy: string
): Promise<CmsDoc<T>> {
  const doc = await readDoc(resource, seed);
  const version = doc.versions.find((v) => v.id === versionId);
  if (!version) throw new Error("That version could not be found.");
  doc.draft = version.snapshot;
  doc.draftUpdatedAt = nowIso();
  doc.draftUpdatedBy = editedBy;
  await atomicWrite(fileFor(resource), doc);
  return doc;
}

/** True when the draft differs from the published copy. */
export function hasUnpublishedChanges<T>(doc: CmsDoc<T>): boolean {
  return JSON.stringify(doc.draft) !== JSON.stringify(doc.published);
}
