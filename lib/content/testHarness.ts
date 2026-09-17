import { readFile } from "fs/promises";
import path from "path";
import { Client } from "pg";
import { hashPassword } from "@/lib/content/password";
import { createUser } from "@/lib/content/repo";
import type { ContentRole, ContentUser } from "@/lib/content/types";

/**
 * Test harness for the workflow suites.
 *
 * The content system has no file backend — its whole point is transactional
 * state transitions and database-enforced immutability, which a JSON file
 * cannot express. So these tests need a real Postgres, and they run against
 * CONTENT_TEST_DATABASE_URL (falling back to the CMS test database, which is
 * already configured as disposable). Its content_* tables are truncated before
 * every test: never point this at real content.
 *
 * Without one, the suites skip loudly rather than passing vacuously — the
 * security properties they check are the reason this feature exists.
 */

export const PG_TEST_URL =
  process.env.CONTENT_TEST_DATABASE_URL || process.env.CMS_TEST_DATABASE_URL;

export const HAS_TEST_DB = Boolean(PG_TEST_URL);

if (!HAS_TEST_DB) {
  console.warn(
    "[content tests] Neither CONTENT_TEST_DATABASE_URL nor CMS_TEST_DATABASE_URL " +
      "is set — the workflow suite is SKIPPED. Permission and approval rules " +
      "are unverified without it."
  );
}

/**
 * Test files run in parallel vitest workers against one database, so each
 * holds an advisory lock for its duration — otherwise one file's TRUNCATE
 * lands in the middle of another file's transaction. A different key from the
 * CMS suite's, so the two can run side by side.
 */
const PG_TEST_LOCK_KEY = 423002;

let lockClient: Client | null = null;
let schemaApplied = false;
const saved: Record<string, string | undefined> = {};

export async function enterTestDb(): Promise<void> {
  saved.DATABASE_URL = process.env.DATABASE_URL;
  saved.CONTENT_DATABASE_URL = process.env.CONTENT_DATABASE_URL;
  process.env.CONTENT_DATABASE_URL = PG_TEST_URL;

  lockClient = new Client({ connectionString: PG_TEST_URL });
  await lockClient.connect();
  await lockClient.query("select pg_advisory_lock($1)", [PG_TEST_LOCK_KEY]);

  if (!schemaApplied) {
    const schema = await readFile(
      path.join(process.cwd(), "scripts/sql/content-schema.sql"),
      "utf8"
    );
    await lockClient.query(schema);
    schemaApplied = true;
  }

  // Reviews and audit have triggers that refuse UPDATE/DELETE. TRUNCATE is a
  // DDL-level operation and bypasses row triggers, which is exactly why it is
  // used here rather than DELETE.
  await lockClient.query(
    "truncate content_audit, content_reviews, content_revisions, content_articles, content_users cascade"
  );
}

export async function exitTestDb(): Promise<void> {
  for (const key of ["DATABASE_URL", "CONTENT_DATABASE_URL"] as const) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  if (lockClient) {
    await lockClient
      .query("select pg_advisory_unlock($1)", [PG_TEST_LOCK_KEY])
      .catch(() => {});
    await lockClient.end().catch(() => {});
    lockClient = null;
  }
}

let seq = 0;

/** A user of the given role, with a unique email per call. */
export async function makeUser(
  role: ContentRole,
  name?: string
): Promise<ContentUser> {
  seq += 1;
  return createUser({
    email: `${role}-${seq}@test.keybase.com`,
    name: name ?? `${role} ${seq}`,
    role,
    passwordHash: await hashPassword("test-password-1234"),
    authorTitle: role === "advisor" ? "Senior Financial Advisor" : "",
  });
}

/** Raw SQL against the test database, for asserting on stored rows directly. */
export async function rawQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await lockClient!.query(text, params as never[]);
  return res.rows as T[];
}
