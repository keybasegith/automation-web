/**
 * Rate limiting for the public answer endpoint.
 *
 * A fixed hourly window per caller, counted server-side in Postgres — the only
 * place a limit can be enforced, since the browser is the thing being limited.
 * The repository has no Redis or Upstash, and adding one for a counter this
 * small would be a new service to operate for no benefit; the same table the
 * feature already uses does the job.
 *
 * The caller is identified by a salted hash of their address. The address
 * itself is never stored, so the table cannot be read as a log of who asked
 * what and when.
 */

import { createHash } from "node:crypto";
import { getConfig } from "@/lib/keybase-answer/config";
import { isConfigured, query } from "@/lib/keybase-answer/db";

export interface RateLimitVerdict {
  allowed: boolean;
  /** Requests left in the current window, after this one. */
  remaining: number;
  limit: number;
  /** When the window resets. Sent as Retry-After on a rejection. */
  resetAt: Date;
}

/**
 * Salt for the caller hash. A deployment that sets nothing still gets a hash;
 * setting it means the stored buckets cannot be checked against a guessed
 * address even by someone holding the database.
 */
function salt(): string {
  return process.env.KEYBASE_ANSWER_RATE_LIMIT_SALT ?? "keybase-answer";
}

export function callerBucket(identifier: string): string {
  return createHash("sha256").update(`${salt()}:${identifier}`).digest("hex");
}

/** The start of the hour containing `now`. Fixed windows, not sliding. */
export function windowStart(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  return start;
}

const memoryCounts = new Map<string, number>();

/**
 * Count one request against the caller's window and report whether it may
 * proceed. Increments first and compares after, so two concurrent requests
 * cannot both read "one left".
 */
export async function consumeRateLimit(
  identifier: string,
  now: Date = new Date(),
): Promise<RateLimitVerdict> {
  const limit = getConfig().hourlyLimit;
  const start = windowStart(now);
  const resetAt = new Date(start.getTime() + 3_600_000);
  const bucket = callerBucket(identifier);
  const key = `${bucket}:${start.toISOString()}`;

  if (!isConfigured()) {
    const count = (memoryCounts.get(key) ?? 0) + 1;
    memoryCounts.set(key, count);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      limit,
      resetAt,
    };
  }

  try {
    const rows = await query<{ count: number }>(
      `insert into ka_rate_limit (bucket, window_start, count)
       values ($1, $2, 1)
       on conflict (bucket, window_start)
         do update set count = ka_rate_limit.count + 1
       returning count`,
      [bucket, start.toISOString()],
    );
    const count = Number(rows[0]?.count ?? 1);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      limit,
      resetAt,
    };
  } catch (err) {
    // A limiter that fails closed would take the feature down with the table.
    // Log and allow: the exposure is one hour of unmetered questions, and the
    // provider's own limits still apply behind it.
    console.warn("[keybase-answer] rate limit check failed, allowing:", err);
    return { allowed: true, remaining: limit, limit, resetAt };
  }
}

/** Remove windows nobody can still be inside. Called by the indexer. */
export async function pruneRateLimitWindows(): Promise<void> {
  if (!isConfigured()) {
    memoryCounts.clear();
    return;
  }
  try {
    await query(`delete from ka_rate_limit where window_start < now() - interval '2 hours'`);
  } catch {
    // Housekeeping. Never worth failing an index run over.
  }
}

/**
 * The caller's identity for limiting purposes, from the proxy headers a Next.js
 * deployment sits behind. Unknown callers share one bucket, which is strict
 * rather than permissive — the alternative is an unlimited anonymous lane.
 */
export function identifyCaller(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Test isolation. */
export function clearRateLimitForTests(): void {
  memoryCounts.clear();
}
