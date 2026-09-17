import { Pool, type PoolClient } from "pg";

/**
 * Postgres access for the content system.
 *
 * Same database and the same connection discipline as the website CMS
 * (lib/cms/storage/postgres.ts): DATABASE_URL, a small pool, and no session
 * state or named prepared statements, because production connects through
 * PgBouncer in transaction mode.
 *
 * A separate pool from the CMS one on purpose — the two modules are wired
 * independently, and sharing a pool would couple their lifecycles for no gain.
 */

export class ContentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentConfigError";
  }
}

let pool: Pool | null = null;
let poolUrl: string | null = null;

export function getPool(): Pool {
  const url = process.env.CONTENT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new ContentConfigError(
      "DATABASE_URL is not set. The content system stores articles in Postgres; " +
        "run `npm run content:migrate` after setting it."
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
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query(text, params as never[]);
  return res.rows as T[];
}

/**
 * Run several statements as one unit.
 *
 * Every workflow transition in this system writes more than one row — a
 * revision plus the article pointer, or a review plus the article status plus
 * an audit entry — and a half-applied transition would leave an article in a
 * state the workflow has no name for. They all go through here.
 */
export async function withTransaction<T>(
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

/** Postgres timestamps come back as Date; the app speaks ISO strings. */
export function iso(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Same, for a column the schema declares NOT NULL. */
export function isoRequired(value: Date | string): string {
  return iso(value) as string;
}
