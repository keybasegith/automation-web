import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { readFile } from "fs/promises";
import { Client } from "pg";

/**
 * Test harness for running the same CMS suites against BOTH storage backends
 * (spec Phase 1-A: "기존 lib/cms/*.test.ts가 두 구현 모두에 대해 통과해야 한다").
 *
 * The file mode always runs. The postgres mode runs when
 * CMS_TEST_DATABASE_URL points at a disposable test database — its cms_*
 * tables are truncated before every test, so never point it at real content.
 */

export type StoreMode = "file" | "postgres";

export const PG_TEST_URL = process.env.CMS_TEST_DATABASE_URL;

export const STORE_MODES: StoreMode[] = PG_TEST_URL
  ? ["file", "postgres"]
  : ["file"];

if (!PG_TEST_URL) {
  console.warn(
    "[cms tests] CMS_TEST_DATABASE_URL is not set — the postgres backend " +
      "suite is SKIPPED. Both backends must pass before release."
  );
}

const saved: Record<string, string | undefined> = {};
let tmpDir: string | null = null;
let schemaApplied = false;

/**
 * Test files run in parallel vitest workers but share the one test database,
 * so every postgres-mode test holds this advisory lock for its whole duration
 * — otherwise one file's TRUNCATE wipes another file's in-flight test.
 */
const PG_TEST_LOCK_KEY = 423001;
let lockClient: Client | null = null;

/** Point the CMS at a fresh, isolated store for one test. */
export async function enterStoreMode(mode: StoreMode): Promise<void> {
  saved.CMS_STORE = process.env.CMS_STORE;
  saved.CMS_DATA_DIR = process.env.CMS_DATA_DIR;
  saved.DATABASE_URL = process.env.DATABASE_URL;

  if (mode === "file") {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "cms-test-"));
    process.env.CMS_STORE = "file";
    process.env.CMS_DATA_DIR = tmpDir;
    return;
  }

  process.env.CMS_STORE = "postgres";
  process.env.DATABASE_URL = PG_TEST_URL;

  lockClient = new Client({ connectionString: PG_TEST_URL });
  await lockClient.connect();
  await lockClient.query("select pg_advisory_lock($1)", [PG_TEST_LOCK_KEY]);
  if (!schemaApplied) {
    const schema = await readFile(
      path.join(process.cwd(), "scripts/sql/cms-schema.sql"),
      "utf8"
    );
    await lockClient.query(schema);
    schemaApplied = true;
  }
  await lockClient.query(
    "truncate cms_documents, cms_versions, cms_media, cms_audit"
  );
}

/** Undo enterStoreMode: restore env, release the DB lock, remove temp dir. */
export async function exitStoreMode(): Promise<void> {
  for (const key of ["CMS_STORE", "CMS_DATA_DIR", "DATABASE_URL"] as const) {
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
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  }
}
