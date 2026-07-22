import { Pool, type PoolClient } from "pg";
import type {
  CmsAuditEntry,
  CmsDoc,
  CmsResource,
  CmsVersion,
  MediaItem,
} from "@/lib/cms/types";
import { CmsConfigError, type CmsBackend } from "@/lib/cms/storage/backend";

/**
 * Postgres-backed CMS storage — production and default.
 *
 * Connects through DATABASE_URL (in production this points at PgBouncer in
 * transaction mode, so no session state or named prepared statements are
 * used). The schema lives in scripts/sql/cms-schema.sql and is applied by
 * scripts/migrate-cms-to-postgres.mjs — this module never creates tables on
 * its own.
 *
 * Every resource is a single document (doc_id 'default'); its version trail
 * is mirrored into cms_versions so the stored rows always equal the
 * CmsDoc.versions array the engine maintains.
 */

const DOC_ID = "default";

let pool: Pool | null = null;
let poolUrl: string | null = null;

function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new CmsConfigError(
      "DATABASE_URL is not set. The CMS stores content in Postgres by default; " +
        "set DATABASE_URL, or set CMS_STORE=file explicitly for local file storage."
    );
  }
  if (!pool || poolUrl !== url) {
    void pool?.end().catch(() => {});
    pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
      // Let serverless instances suspend without dangling handles.
      allowExitOnIdle: true,
    });
    poolUrl = url;
  }
  return pool;
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export class PostgresBackend implements CmsBackend {
  async loadDoc(resource: CmsResource): Promise<CmsDoc<unknown> | null> {
    const p = getPool();
    const docRes = await p.query(
      `select draft, published, draft_updated_at, draft_updated_by,
              published_at, published_by
         from cms_documents
        where resource = $1 and doc_id = $2`,
      [resource, DOC_ID]
    );
    if (docRes.rowCount === 0) return null;
    const row = docRes.rows[0];

    const verRes = await p.query(
      `select id, version_number, snapshot, change_summary,
              is_published_version, created_by, created_at
         from cms_versions
        where resource = $1 and doc_id = $2
        order by version_number desc`,
      [resource, DOC_ID]
    );
    const versions: CmsVersion<unknown>[] = verRes.rows.map((v) => ({
      id: v.id,
      versionNumber: v.version_number,
      snapshot: v.snapshot,
      changeSummary: v.change_summary,
      createdBy: v.created_by,
      createdAt: iso(v.created_at) as string,
      isPublishedVersion: v.is_published_version,
    }));

    return {
      resource,
      draft: row.draft,
      published: row.published,
      versions,
      draftUpdatedAt: iso(row.draft_updated_at) as string,
      draftUpdatedBy: row.draft_updated_by,
      publishedAt: iso(row.published_at),
      publishedBy: row.published_by,
    };
  }

  async saveDoc(doc: CmsDoc<unknown>): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(
        `insert into cms_documents
           (resource, doc_id, draft, published, draft_updated_at,
            draft_updated_by, published_at, published_by, updated_at)
         values ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, now())
         on conflict (resource, doc_id) do update set
           draft = excluded.draft,
           published = excluded.published,
           draft_updated_at = excluded.draft_updated_at,
           draft_updated_by = excluded.draft_updated_by,
           published_at = excluded.published_at,
           published_by = excluded.published_by,
           updated_at = now()`,
        [
          doc.resource,
          DOC_ID,
          JSON.stringify(doc.draft),
          doc.published === null ? null : JSON.stringify(doc.published),
          doc.draftUpdatedAt,
          doc.draftUpdatedBy,
          doc.publishedAt,
          doc.publishedBy,
        ]
      );

      // Mirror the version trail exactly: drop rows the engine trimmed,
      // keep existing ones, add the newly archived snapshot.
      const ids = doc.versions.map((v) => v.id);
      await client.query(
        `delete from cms_versions
          where resource = $1 and doc_id = $2 and not (id = any($3::uuid[]))`,
        [doc.resource, DOC_ID, ids]
      );
      for (const v of doc.versions) {
        await client.query(
          `insert into cms_versions
             (id, resource, doc_id, version_number, snapshot, change_summary,
              is_published_version, created_by, created_at)
           values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
           on conflict (id) do nothing`,
          [
            v.id,
            doc.resource,
            DOC_ID,
            v.versionNumber,
            JSON.stringify(v.snapshot),
            v.changeSummary,
            v.isPublishedVersion,
            v.createdBy,
            v.createdAt,
          ]
        );
      }
    });
  }

  async appendAudit(entry: CmsAuditEntry): Promise<void> {
    await getPool().query(
      `insert into cms_audit (id, user_id, action, resource, description, created_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing`,
      [
        entry.id,
        entry.userId,
        entry.action,
        entry.resource,
        entry.description,
        entry.createdAt,
      ]
    );
  }

  async listAudit(limit: number): Promise<CmsAuditEntry[]> {
    const res = await getPool().query(
      `select id, user_id, action, resource, description, created_at
         from cms_audit
        order by created_at desc
        limit $1`,
      [limit]
    );
    return res.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      action: r.action,
      resource: r.resource,
      description: r.description,
      createdAt: iso(r.created_at) as string,
    }));
  }

  private mediaFromRow(r: {
    id: string;
    file_key: string;
    file_name: string;
    file_type: string;
    file_size: string | number;
    alt_text: string;
    uploaded_by: string;
    uploaded_at: Date | string;
  }): MediaItem {
    return {
      id: r.id,
      fileKey: r.file_key,
      fileName: r.file_name,
      fileType: r.file_type,
      fileSize: Number(r.file_size),
      altText: r.alt_text,
      uploadedBy: r.uploaded_by,
      uploadedAt: iso(r.uploaded_at) as string,
    };
  }

  async listMedia(): Promise<MediaItem[]> {
    const res = await getPool().query(
      `select id, file_key, file_name, file_type, file_size, alt_text,
              uploaded_by, uploaded_at
         from cms_media
        order by uploaded_at desc`
    );
    return res.rows.map((r) => this.mediaFromRow(r));
  }

  async getMedia(id: string): Promise<MediaItem | null> {
    const res = await getPool().query(
      `select id, file_key, file_name, file_type, file_size, alt_text,
              uploaded_by, uploaded_at
         from cms_media
        where id = $1`,
      [id]
    );
    return res.rowCount === 0 ? null : this.mediaFromRow(res.rows[0]);
  }

  async insertMedia(item: MediaItem): Promise<void> {
    await getPool().query(
      `insert into cms_media
         (id, file_key, file_name, file_type, file_size, alt_text,
          uploaded_by, uploaded_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        item.id,
        item.fileKey,
        item.fileName,
        item.fileType,
        item.fileSize,
        item.altText,
        item.uploadedBy,
        item.uploadedAt,
      ]
    );
  }

  async updateMedia(item: MediaItem): Promise<void> {
    await getPool().query(
      `update cms_media
          set file_key = $2, file_name = $3, file_type = $4, file_size = $5,
              alt_text = $6, uploaded_by = $7, uploaded_at = $8
        where id = $1`,
      [
        item.id,
        item.fileKey,
        item.fileName,
        item.fileType,
        item.fileSize,
        item.altText,
        item.uploadedBy,
        item.uploadedAt,
      ]
    );
  }

  async deleteMedia(id: string): Promise<void> {
    await getPool().query(`delete from cms_media where id = $1`, [id]);
  }
}
