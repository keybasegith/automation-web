import { CmsConfigError, type CmsBackend } from "@/lib/cms/storage/backend";
import { FileBackend } from "@/lib/cms/storage/file";
import { PostgresBackend } from "@/lib/cms/storage/postgres";

/**
 * Backend selection — the ONLY place that decides where CMS content lives.
 *
 * - Default (CMS_STORE unset or "postgres"): Postgres via DATABASE_URL.
 * - CMS_STORE=file: file storage under data/. Local development only, and
 *   only ever by explicit opt-in.
 *
 * There is deliberately no fallback chain: a missing DATABASE_URL without
 * CMS_STORE=file throws, and an unknown CMS_STORE value throws. See
 * instrumentation.ts for the boot-time check that surfaces this at startup.
 */

const fileBackend = new FileBackend();
const postgresBackend = new PostgresBackend();

export function getCmsBackend(): CmsBackend {
  const mode = process.env.CMS_STORE ?? "postgres";
  if (mode === "file") return fileBackend;
  if (mode === "postgres") return postgresBackend; // DATABASE_URL checked on connect
  throw new CmsConfigError(
    `Unknown CMS_STORE value "${mode}". Use "postgres" (default) or "file".`
  );
}

/** Boot-time validation. Throws CmsConfigError on a bad configuration. */
export function assertCmsStorageConfigured(): void {
  const mode = process.env.CMS_STORE ?? "postgres";
  if (mode === "file") {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
      throw new CmsConfigError(
        "CMS_STORE=file cannot be used on Vercel: the runtime filesystem is " +
          "read-only and reset on every deploy. Unset CMS_STORE and set DATABASE_URL."
      );
    }
    return;
  }
  if (mode !== "postgres") {
    throw new CmsConfigError(
      `Unknown CMS_STORE value "${mode}". Use "postgres" (default) or "file".`
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new CmsConfigError(
      "DATABASE_URL is not set. The CMS stores content in Postgres by default; " +
        "set DATABASE_URL, or set CMS_STORE=file explicitly for local file storage."
    );
  }
}
