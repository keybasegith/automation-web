import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  callerBucket,
  clearRateLimitForTests,
  consumeRateLimit,
  identifyCaller,
  windowStart,
} from "@/lib/keybase-answer/rate-limit";

/**
 * These exercise the in-memory limiter, which is what runs with no database
 * configured. The Postgres path uses the same window arithmetic and the same
 * increment-then-compare ordering, in one atomic upsert.
 */
const savedDatabaseUrl = process.env.DATABASE_URL;
const savedAnswerUrl = process.env.KEYBASE_ANSWER_DATABASE_URL;
const savedLimit = process.env.KEYBASE_ANSWER_HOURLY_LIMIT;

beforeEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.KEYBASE_ANSWER_DATABASE_URL;
  process.env.KEYBASE_ANSWER_HOURLY_LIMIT = "3";
  clearRateLimitForTests();
});

afterEach(() => {
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;
  if (savedAnswerUrl === undefined) delete process.env.KEYBASE_ANSWER_DATABASE_URL;
  else process.env.KEYBASE_ANSWER_DATABASE_URL = savedAnswerUrl;
  if (savedLimit === undefined) delete process.env.KEYBASE_ANSWER_HOURLY_LIMIT;
  else process.env.KEYBASE_ANSWER_HOURLY_LIMIT = savedLimit;
});

describe("consumeRateLimit", () => {
  it("allows up to the limit and refuses after it", async () => {
    const now = new Date("2026-08-31T10:20:00.000Z");
    const verdicts = [];
    for (let i = 0; i < 4; i += 1) {
      verdicts.push(await consumeRateLimit("198.51.100.7", now));
    }
    expect(verdicts.map((v) => v.allowed)).toEqual([true, true, true, false]);
    expect(verdicts.map((v) => v.remaining)).toEqual([2, 1, 0, 0]);
  });

  it("counts each caller separately", async () => {
    const now = new Date("2026-08-31T10:20:00.000Z");
    await consumeRateLimit("198.51.100.7", now);
    await consumeRateLimit("198.51.100.7", now);
    await consumeRateLimit("198.51.100.7", now);
    expect((await consumeRateLimit("203.0.113.4", now)).allowed).toBe(true);
  });

  it("starts a fresh allowance in the next hour", async () => {
    const first = new Date("2026-08-31T10:59:00.000Z");
    for (let i = 0; i < 3; i += 1) await consumeRateLimit("198.51.100.7", first);
    expect((await consumeRateLimit("198.51.100.7", first)).allowed).toBe(false);

    const next = new Date("2026-08-31T11:00:30.000Z");
    expect((await consumeRateLimit("198.51.100.7", next)).allowed).toBe(true);
  });

  it("reports when the window resets", async () => {
    const verdict = await consumeRateLimit(
      "198.51.100.7",
      new Date("2026-08-31T10:20:00.000Z"),
    );
    expect(verdict.resetAt.toISOString()).toBe("2026-08-31T11:00:00.000Z");
  });
});

describe("windowStart", () => {
  it("floors to the hour", () => {
    expect(windowStart(new Date("2026-08-31T10:59:59.999Z")).toISOString()).toBe(
      "2026-08-31T10:00:00.000Z",
    );
  });
});

describe("callerBucket", () => {
  it("hashes the caller, so no address is ever stored", () => {
    const bucket = callerBucket("198.51.100.7");
    expect(bucket).not.toContain("198.51.100.7");
    expect(bucket).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable for one caller and distinct between callers", () => {
    expect(callerBucket("198.51.100.7")).toBe(callerBucket("198.51.100.7"));
    expect(callerBucket("198.51.100.7")).not.toBe(callerBucket("203.0.113.4"));
  });
});

describe("identifyCaller", () => {
  it("takes the client address from the front of x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.7, 203.0.113.9, 192.0.2.1",
    });
    expect(identifyCaller(headers)).toBe("198.51.100.7");
  });

  it("falls back to x-real-ip", () => {
    expect(identifyCaller(new Headers({ "x-real-ip": "203.0.113.4" }))).toBe(
      "203.0.113.4",
    );
  });

  it("puts unidentifiable callers in one shared bucket rather than an unlimited lane", () => {
    expect(identifyCaller(new Headers())).toBe("unknown");
  });
});
