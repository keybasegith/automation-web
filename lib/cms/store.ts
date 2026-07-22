import { randomUUID } from "crypto";
import type { CmsDoc, CmsResource, CmsVersion } from "@/lib/cms/types";
import { getCmsBackend } from "@/lib/cms/storage";

/**
 * The draft/publish/version engine shared by every CMS resource.
 *
 * Each resource is one {@link CmsDoc}: a working `draft`, the live `published`
 * copy, and a trail of previous published `versions`. On first read a document
 * is seeded from the supplied factory and both draft and published start equal
 * — so a freshly installed site already shows the current hardcoded content.
 *
 * Persistence is delegated to a {@link import("./storage/backend").CmsBackend}
 * (Postgres in production, files for explicit local development); this module
 * owns the document semantics and never touches storage directly.
 */

/** Cap version history so documents can't grow without bound. */
const MAX_VERSIONS = 25;

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Read a document, seeding it on first access. The seed becomes both the draft
 * and the initial published copy so the public site renders immediately.
 */
export async function readDoc<T>(
  resource: CmsResource,
  seed: () => T
): Promise<CmsDoc<T>> {
  const backend = getCmsBackend();
  const existing = await backend.loadDoc(resource);
  if (existing) return existing as CmsDoc<T>;

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
  await backend.saveDoc(doc);
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
  await getCmsBackend().saveDoc(doc);
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
  await getCmsBackend().saveDoc(doc);
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
    await getCmsBackend().saveDoc(doc);
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
  await getCmsBackend().saveDoc(doc);
  return doc;
}

/** True when the draft differs from the published copy. */
export function hasUnpublishedChanges<T>(doc: CmsDoc<T>): boolean {
  return JSON.stringify(doc.draft) !== JSON.stringify(doc.published);
}
