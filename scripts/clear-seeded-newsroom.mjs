#!/usr/bin/env node
/**
 * Clear the seeded placeholder articles out of the newsroom CMS document.
 *
 *   node --env-file=.env.local scripts/clear-seeded-newsroom.mjs [--force]
 *   (or: npm run cms:clear-newsroom)
 *
 * Why this exists: the newsroom listing is driven by the published article
 * store in lib/insights/articles.ts. The CMS collection used to be seeded with
 * seven headline-only placeholders, and that seed is now empty — but an
 * environment whose database was seeded before the change still holds its own
 * copy of those rows, and no code change can reach them. This clears them.
 *
 * Safety:
 * - Refuses to touch articles that were edited by a human. It only clears when
 *   the document is still exactly as seeded (`system (seed)`), unless --force.
 * - Prints the JSON it is about to discard, so it can be pasted back.
 * - Idempotent: running it against an already-clear newsroom does nothing.
 * - Leaves the hero copy, version history, and every other resource untouched.
 */
import pg from "pg";

const DOC_ID = "default";
const force = process.argv.includes("--force");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/clear-seeded-newsroom.mjs"
  );
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });

try {
  const { rows } = await pool.query(
    `select draft, published, draft_updated_by, published_by
       from cms_documents
      where resource = 'newsroom' and doc_id = $1`,
    [DOC_ID]
  );

  if (rows.length === 0) {
    console.log("No newsroom document in this database — nothing to clear.");
    process.exit(0);
  }

  const [doc] = rows;
  const counts = {
    draft: doc.draft?.articles?.length ?? 0,
    published: doc.published?.articles?.length ?? 0,
  };

  if (counts.draft === 0 && counts.published === 0) {
    console.log("Newsroom already has no CMS articles — nothing to do.");
    process.exit(0);
  }

  const seededOnly =
    doc.draft_updated_by === "system (seed)" && doc.published_by === "system (seed)";

  if (!seededOnly && !force) {
    console.error(
      `Refusing to clear: this newsroom has been edited by a human ` +
        `(draft by "${doc.draft_updated_by}", published by "${doc.published_by}").\n` +
        `Review the entries in /website-admin-cms/newsroom, or re-run with --force ` +
        `if you are certain they are placeholders.`
    );
    process.exit(1);
  }

  console.log(
    `Discarding ${counts.draft} draft and ${counts.published} published article(s):`
  );
  console.log(JSON.stringify(doc.published?.articles ?? doc.draft?.articles, null, 2));

  await pool.query(
    `update cms_documents
        set draft = jsonb_set(draft, '{articles}', '[]'::jsonb),
            published = case
              when published is null then published
              else jsonb_set(published, '{articles}', '[]'::jsonb)
            end
      where resource = 'newsroom' and doc_id = $1`,
    [DOC_ID]
  );

  console.log("\nCleared. The newsroom now lists only published articles.");
} finally {
  await pool.end();
}
