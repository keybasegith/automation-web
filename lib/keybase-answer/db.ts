/**
 * Postgres access for Keybase Answer.
 *
 * Same connection discipline as the rest of the repository (lib/content/db.ts,
 * lib/cms/storage/postgres.ts): DATABASE_URL, a small pool, no session state and
 * no named prepared statements, because production connects through PgBouncer in
 * transaction mode.
 *
 * A separate pool from the CMS and content ones, for the same reason those are
 * separate from each other — sharing would couple three independently wired
 * modules' lifecycles for no gain.
 *
 * `isConfigured()` exists so every caller can degrade rather than crash: with no
 * database the feature runs entirely in memory, which is what makes
 * KEYBASE_ANSWER_USE_MOCK=true a working local experience.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

let pool: Pool | null = null;
let poolUrl: string | null = null;

export function databaseUrl(): string | undefined {
  const url = process.env.KEYBASE_ANSWER_DATABASE_URL || process.env.DATABASE_URL;
  return url && url.trim() ? url.trim() : undefined;
}

export function isConfigured(): boolean {
  return databaseUrl() !== undefined;
}

export function getPool(): Pool {
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Keybase Answer stores its knowledge index in Postgres; " +
        "set DATABASE_URL and run `npm run keybase-answer:index`.",
    );
  }
  if (!pool || poolUrl !== url) {
    void pool?.end().catch(() => {});
    pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
      allowExitOnIdle: true,
    });
    poolUrl = url;
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query(text, params as never[]);
  return result.rows as T[];
}

export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const value = await fn(client);
    await client.query("commit");
    return value;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Close the pool. Scripts call this so the process can exit. */
export async function closePool(): Promise<void> {
  const current = pool;
  pool = null;
  poolUrl = null;
  await current?.end().catch(() => {});
}

let schemaApplied = false;

/**
 * Apply the (idempotent) schema.
 *
 * COMMAND-LINE ONLY. Never call this from a route, a component, or anything on
 * the request path: it reads a file out of scripts/, which is not part of a
 * deployed serverless bundle, and creating tables during a request is not a
 * thing an application should do anyway. The same rule the website CMS follows
 * (lib/cms/storage/postgres.ts) — the tables are made by a migration, and the
 * application only ever reads and writes them.
 *
 * The indexer calls this so `npm run keybase-answer:index` works on a fresh
 * database without a separate step having to be remembered first.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaApplied) return;
  const file = path.join(process.cwd(), "scripts", "sql", "keybase-answer-schema.sql");
  const sql = await readFile(file, "utf8");
  await getPool().query(sql);
  schemaApplied = true;
}

/**
 * Whether a Postgres error is "that table does not exist".
 *
 * Distinguished from every other database failure so the answer path can say
 * "the index has not been built yet" — which is actionable — rather than
 * surfacing a driver error, which is not.
 */
export function isMissingRelation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "42P01"
  );
}
