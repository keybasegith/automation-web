#!/usr/bin/env node
/**
 * Applies the Keybase Answer storage schema.
 *
 *   node --env-file=.env.local scripts/migrate-keybase-answer.mjs
 *   (or: npm run keybase-answer:migrate)
 *
 * Applies scripts/sql/keybase-answer-schema.sql, which is idempotent. The
 * indexer applies the same file before it writes, so this exists for the case
 * where you want the tables in place first — a fresh environment, a review of
 * what will be created, or a deploy step that migrates separately.
 *
 * Prints the row counts afterwards so it is obvious whether the index has been
 * built yet.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/migrate-keybase-answer.mjs",
  );
  process.exit(1);
}

const TABLES = [
  "ka_documents",
  "ka_chunks",
  "ka_index_meta",
  "ka_answer_cache",
  "ka_rate_limit",
  "ka_events",
  "ka_feedback",
];

const pool = new pg.Pool({ connectionString: url, max: 1 });

try {
  const sql = await readFile(
    path.join(root, "scripts", "sql", "keybase-answer-schema.sql"),
    "utf8",
  );
  await pool.query(sql);
  console.log("Applied scripts/sql/keybase-answer-schema.sql\n");

  for (const table of TABLES) {
    const { rows } = await pool.query(`select count(*)::text as count from ${table}`);
    console.log(`  ${table.padEnd(20)} ${rows[0].count}`);
  }

  const { rows: meta } = await pool.query(
    "select index_version, embedding_model from ka_index_meta where id = 'default'",
  );
  console.log(
    meta.length === 0
      ? "\nNo index built yet. Run: npm run keybase-answer:index"
      : `\nIndex version: ${meta[0].index_version} (${meta[0].embedding_model})`,
  );
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
