import type {
  CmsAuditEntry,
  CmsDoc,
  CmsResource,
  MediaItem,
} from "@/lib/cms/types";

/**
 * Persistence backends for the website CMS.
 *
 * The draft/publish/version engine in lib/cms/store.ts and the audit/media
 * repos are backend-agnostic: they operate on whole documents and rows, and a
 * backend only knows how to load and save them. Two implementations exist:
 *
 * - PostgresBackend (lib/cms/storage/postgres.ts) — production and default.
 * - FileBackend (lib/cms/storage/file.ts) — local development only, selected
 *   ONLY by the explicit env var CMS_STORE=file. There is no automatic
 *   fallback: a missing DATABASE_URL is a fatal configuration error.
 *
 * Selection lives in lib/cms/storage/index.ts.
 */

export interface CmsBackend {
  /** The stored document, or null if this resource has never been written. */
  loadDoc(resource: CmsResource): Promise<CmsDoc<unknown> | null>;
  /** Persist a whole document (draft, published, and its version trail). */
  saveDoc(doc: CmsDoc<unknown>): Promise<void>;

  /** Append one audit entry. */
  appendAudit(entry: CmsAuditEntry): Promise<void>;
  /** Most recent audit entries, newest first. */
  listAudit(limit: number): Promise<CmsAuditEntry[]>;

  /** All media metadata rows, newest first. */
  listMedia(): Promise<MediaItem[]>;
  getMedia(id: string): Promise<MediaItem | null>;
  insertMedia(item: MediaItem): Promise<void>;
  updateMedia(item: MediaItem): Promise<void>;
  deleteMedia(id: string): Promise<void>;
}

/**
 * A missing or contradictory storage configuration. Deliberately loud — the
 * CMS must never silently fall back to a different storage backend.
 */
export class CmsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsConfigError";
  }
}
