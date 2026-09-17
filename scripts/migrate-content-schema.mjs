#!/usr/bin/env node
/**
 * Applies the Advisor Content CMS schema, and seeds the first admin account.
 *
 *   node --env-file=.env.local scripts/migrate-content-schema.mjs
 *   (or: npm run content:migrate)
 *
 * - Applies scripts/sql/content-schema.sql (idempotent — create/alter guarded).
 * - Seeds one admin user from CONTENT_ADMIN_EMAIL / CONTENT_ADMIN_PASSWORD when
 *   the users table is empty, so there is somebody who can sign in and create
 *   the rest. Never overwrites an existing account.
 * - Prints table counts before and after for verification.
 *
 * Passwords are stored as scrypt hashes in the same format lib/content/password.ts
 * produces and verifies. This script never writes a plaintext password.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL is not set. Run with: node --env-file=.env.local scripts/migrate-content-schema.mjs"
  );
  process.exit(1);
}

// Must stay in step with lib/content/password.ts.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(plain) {
  const salt = randomBytes(16);
  const hash = scryptSync(plain.normalize("NFKC"), salt, SCRYPT.keylen, {
    N: SCRYPT.N,
    r: SCRYPT.r,
    p: SCRYPT.p,
    maxmem: 128 * SCRYPT.N * SCRYPT.r * 2,
  });
  return [
    "scrypt",
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

async function counts(client) {
  const q = async (t) =>
    Number((await client.query(`select count(*) n from ${t}`)).rows[0].n);
  return {
    users: await q("content_users"),
    articles: await q("content_articles"),
    revisions: await q("content_revisions"),
    reviews: await q("content_reviews"),
    audit: await q("content_audit"),
  };
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const schema = await readFile(
    path.join(root, "scripts/sql/content-schema.sql"),
    "utf8"
  );
  await client.query(schema);
  console.log("Schema applied (idempotent).");

  const before = await counts(client);
  console.log("Before:", before);

  if (before.users === 0) {
    const email = (process.env.CONTENT_ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.CONTENT_ADMIN_PASSWORD || "";
    const name = process.env.CONTENT_ADMIN_NAME || "Keybase Administrator";

    if (!email || !password) {
      console.log(
        "\nNo users yet, and CONTENT_ADMIN_EMAIL / CONTENT_ADMIN_PASSWORD are not set.\n" +
          "Nobody can sign in to /content until an admin exists. Re-run with:\n" +
          "  CONTENT_ADMIN_EMAIL=you@keybase.com CONTENT_ADMIN_PASSWORD='…' npm run content:migrate"
      );
    } else if (password.length < 10) {
      console.error("\nCONTENT_ADMIN_PASSWORD must be at least 10 characters.");
      process.exitCode = 1;
    } else {
      await client.query(
        `insert into content_users (id, email, name, role, password_hash, author_title)
         values ($1, $2, $3, 'admin', $4, $5)
         on conflict (email) do nothing`,
        [randomUUID(), email, name, hashPassword(password), "Keybase Financial Group"]
      );
      console.log(`Seeded admin account: ${email}`);
    }
  }

  console.log("After: ", await counts(client));
} finally {
  await client.end();
}
