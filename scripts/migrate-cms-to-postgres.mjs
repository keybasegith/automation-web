#!/usr/bin/env node
/**
 * One-way, re-runnable migration of file-based CMS content into Postgres.
 *
 *   node --env-file=.env.local scripts/migrate-cms-to-postgres.mjs
 *   (or: npm run cms:migrate)
 *
 * - Applies scripts/sql/cms-schema.sql (idempotent).
 * - Copies data/cms/<resource>.json documents + versions, and
 *   data/cms-audit.json entries, into the tables.
 * - NEVER deletes or modifies the source files.
 * - Inserts use ON CONFLICT DO NOTHING, so re-running never overwrites
 *   content that has since been edited in the database.
 * - Prints document/version/audit counts before and after for verification.
 *
 * Rollback: see docs/cms-storage-rollback.md.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOC_ID = "default";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/migrate-cms-to-postgres.mjs"
  );
  process.exit(1);
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function tableCounts(client) {
  const q = async (sql) => Number((await client.query(sql)).rows[0].n);
  return {
    documents: await q("select count(*) n from cms_documents"),
    versions: await q("select count(*) n from cms_versions"),
    audit: await q("select count(*) n from cms_audit"),
  };
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  // 1. Schema (idempotent).
  const schema = await readFile(path.join(root, "scripts/sql/cms-schema.sql"), "utf8");
  await client.query(schema);
  console.log("Schema applied (create table if not exists).");

  // 2. Source inventory.
  const cmsDir = path.join(root, "data", "cms");
  let files = [];
  try {
    files = (await readdir(cmsDir)).filter((f) => f.endsWith(".json"));
  } catch {
    console.log(`No ${cmsDir} directory — nothing to migrate.`);
  }

  const docs = [];
  for (const f of files) {
    const doc = await readJsonIfExists(path.join(cmsDir, f));
    if (doc && typeof doc === "object" && "draft" in doc) docs.push(doc);
    else console.warn(`Skipping ${f}: not a CmsDoc.`);
  }
  const audit = (await readJsonIfExists(path.join(root, "data", "cms-audit.json"))) ?? [];
  const sourceVersions = docs.reduce((n, d) => n + (d.versions?.length ?? 0), 0);

  console.log(
    `Source files: ${docs.length} documents, ${sourceVersions} versions, ${audit.length} audit entries.`
  );
  const before = await tableCounts(client);
  console.log(
    `DB before:    ${before.documents} documents, ${before.versions} versions, ${before.audit} audit entries.`
  );

  // 3. Copy. DO NOTHING on conflict → re-runs never clobber DB edits.
  let insertedDocs = 0;
  let insertedVersions = 0;
  for (const doc of docs) {
    const res = await client.query(
      `insert into cms_documents
         (resource, doc_id, draft, published, draft_updated_at,
          draft_updated_by, published_at, published_by)
       values ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)
       on conflict (resource, doc_id) do nothing`,
      [
        doc.resource,
        DOC_ID,
        JSON.stringify(doc.draft),
        doc.published === null ? null : JSON.stringify(doc.published),
        doc.draftUpdatedAt ?? new Date().toISOString(),
        doc.draftUpdatedBy ?? "migration",
        doc.publishedAt ?? null,
        doc.publishedBy ?? null,
      ]
    );
    insertedDocs += res.rowCount;
    if (res.rowCount === 0) {
      console.log(`  ${doc.resource}: already in DB, skipped (not overwritten).`);
      continue;
    }
    for (const v of doc.versions ?? []) {
      const vr = await client.query(
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
          v.changeSummary ?? "",
          v.isPublishedVersion ?? true,
          v.createdBy ?? "unknown",
          v.createdAt ?? new Date().toISOString(),
        ]
      );
      insertedVersions += vr.rowCount;
    }
  }

  let insertedAudit = 0;
  for (const a of Array.isArray(audit) ? audit : []) {
    const ar = await client.query(
      `insert into cms_audit (id, user_id, action, resource, description, created_at)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do nothing`,
      [a.id, a.userId, a.action, a.resource, a.description, a.createdAt]
    );
    insertedAudit += ar.rowCount;
  }

  const after = await tableCounts(client);
  console.log(
    `Inserted:     ${insertedDocs} documents, ${insertedVersions} versions, ${insertedAudit} audit entries.`
  );
  console.log(
    `DB after:     ${after.documents} documents, ${after.versions} versions, ${after.audit} audit entries.`
  );
  console.log("Source files were NOT modified or deleted.");
} finally {
  await client.end();
}
