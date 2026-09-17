import { afterEach, describe, expect, it } from "vitest";

import {
  isProtectedApi,
  isProtectedPage,
  isPublicException,
  requiresSession,
} from "@/lib/auth/routes";
import {
  issueSessionToken,
  sessionCookieOptions,
  sessionTokenFromRequest,
  sessionUserFromRequest,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  requestHasValidSession,
  userIdFromToken,
} from "@/lib/auth/session";
import { hashPassword } from "@/lib/content/password";
import { findUserById, isAuthConfigured, verifyCredentials } from "@/lib/auth/users";

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";

const ENV_KEYS = [
  "AUTH_SESSION_SECRET",
  "INTERNAL_ADMIN_EMAIL",
  "INTERNAL_ADMIN_PASSWORD_HASH",
] as const;

const originalNodeEnv = process.env.NODE_ENV;

// process.env is a proxy that only accepts a full data descriptor.
function setNodeEnv(value: string) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  setNodeEnv(originalNodeEnv ?? "test");
});

const withCookie = (token: string) =>
  new Request("https://app.example.com/api/internal-ai/chat", {
    method: "POST",
    headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
  });

describe("session tokens", () => {
  it("round-trips a token it issued", () => {
    expect(userIdFromToken(issueSessionToken(ADMIN_ID))).toBe(ADMIN_ID);
  });

  it("refuses a token signed with a different secret", () => {
    process.env.AUTH_SESSION_SECRET = "secret-one";
    const token = issueSessionToken(ADMIN_ID);
    process.env.AUTH_SESSION_SECRET = "secret-two";
    expect(userIdFromToken(token)).toBeNull();
  });

  it("refuses a tampered expiry", () => {
    const [id, , signature] = issueSessionToken(ADMIN_ID).split(".");
    const extended = `${id}.${Date.now() + 10 * 365 * 24 * 3600_000}.${signature}`;
    expect(userIdFromToken(extended)).toBeNull();
  });

  it("refuses a tampered user id", () => {
    const [, expiresAt, signature] = issueSessionToken(ADMIN_ID).split(".");
    expect(userIdFromToken(`somebody-else.${expiresAt}.${signature}`)).toBeNull();
  });

  it("refuses an expired token", () => {
    const expired = issueSessionToken(ADMIN_ID, Date.now() - SESSION_MAX_AGE * 1000 - 1000);
    expect(userIdFromToken(expired)).toBeNull();
  });

  it("expires exactly at the boundary, not after it", () => {
    const issuedAt = 1_000_000;
    const token = issueSessionToken(ADMIN_ID, issuedAt);
    const expiry = issuedAt + SESSION_MAX_AGE * 1000;
    expect(userIdFromToken(token, expiry - 1)).toBe(ADMIN_ID);
    expect(userIdFromToken(token, expiry)).toBeNull();
  });

  it.each([
    ["nothing", null],
    ["an empty string", ""],
    ["a random string", "garbage"],
    ["too few segments", `${ADMIN_ID}.123`],
    ["too many segments", `${ADMIN_ID}.123.sig.extra`],
    ["empty segments", ".."],
  ])("refuses %s", (_label, token) => {
    expect(userIdFromToken(token as string | null)).toBeNull();
  });

  it("reads the cookie off a request, and ignores others", () => {
    const token = issueSessionToken(ADMIN_ID);
    const request = new Request("https://app.example.com/", {
      headers: { cookie: `other=1; ${SESSION_COOKIE_NAME}=${token}; kb_admin_session=x` },
    });
    expect(sessionTokenFromRequest(request)).toBe(token);
    expect(requestHasValidSession(request)).toBe(true);
  });

  it("reports no session when the cookie is absent", () => {
    const request = new Request("https://app.example.com/", {
      headers: { cookie: "kb_admin_session=x" },
    });
    expect(sessionTokenFromRequest(request)).toBeNull();
    expect(requestHasValidSession(request)).toBe(false);
  });

  it("refuses to sign with a default key in production", () => {
    setNodeEnv("production");
    expect(() => issueSessionToken(ADMIN_ID)).toThrow(/AUTH_SESSION_SECRET/);
  });

  it("accepts nothing in production without a secret", () => {
    setNodeEnv("production");
    expect(userIdFromToken(`${ADMIN_ID}.${Date.now() + 1000}.anything`)).toBeNull();
  });
});

describe("session cookie attributes", () => {
  it("is httpOnly, lax, path-wide, and expires", () => {
    const options = sessionCookieOptions(SESSION_MAX_AGE);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(SESSION_MAX_AGE);
  });

  it("is not secure in development, and secure in production", () => {
    expect(sessionCookieOptions(SESSION_MAX_AGE).secure).toBe(false);
    setNodeEnv("production");
    expect(sessionCookieOptions(SESSION_MAX_AGE).secure).toBe(true);
  });

  it("clears with maxAge 0 and the same attributes", () => {
    const cleared = sessionCookieOptions(0);
    expect(cleared.maxAge).toBe(0);
    expect(cleared.httpOnly).toBe(true);
    expect(cleared.path).toBe("/");
  });
});

describe("credentials", () => {
  it("accepts the configured email and password", async () => {
    process.env.INTERNAL_ADMIN_EMAIL = "Ops@Keybase.com";
    process.env.INTERNAL_ADMIN_PASSWORD_HASH = await hashPassword("a-long-real-password");
    const result = await verifyCredentials("ops@keybase.com", "a-long-real-password");
    expect(result.ok).toBe(true);
    expect(result.user).toMatchObject({ id: ADMIN_ID, email: "ops@keybase.com" });
  });

  it("rejects the wrong password", async () => {
    process.env.INTERNAL_ADMIN_EMAIL = "ops@keybase.com";
    process.env.INTERNAL_ADMIN_PASSWORD_HASH = await hashPassword("a-long-real-password");
    expect((await verifyCredentials("ops@keybase.com", "wrong")).ok).toBe(false);
  });

  it("rejects an unknown email with the same shape of answer", async () => {
    process.env.INTERNAL_ADMIN_EMAIL = "ops@keybase.com";
    process.env.INTERNAL_ADMIN_PASSWORD_HASH = await hashPassword("a-long-real-password");
    const unknown = await verifyCredentials("nobody@keybase.com", "a-long-real-password");
    expect(unknown).toEqual({ ok: false });
  });

  it.each([
    ["a missing email", undefined, "pw"],
    ["a non-string password", "ops@keybase.com", 12345],
    ["an object", {}, {}],
  ])("rejects %s", async (_label, email, password) => {
    expect((await verifyCredentials(email, password)).ok).toBe(false);
  });

  it("never returns a hash or a token", async () => {
    process.env.INTERNAL_ADMIN_PASSWORD_HASH = await hashPassword("a-long-real-password");
    process.env.INTERNAL_ADMIN_EMAIL = "ops@keybase.com";
    const result = await verifyCredentials("ops@keybase.com", "a-long-real-password");
    expect(JSON.stringify(result)).not.toContain("scrypt");
    expect(Object.keys(result.user ?? {})).toEqual(["id", "email", "role", "name"]);
  });

  it("refuses every credential in production when nothing is configured", async () => {
    setNodeEnv("production");
    expect((await verifyCredentials("admin@keybase.com", "12345")).ok).toBe(false);
    expect(isAuthConfigured()).toBe(false);
  });

  it("resolves no user in production when nothing is configured", () => {
    setNodeEnv("production");
    expect(findUserById(ADMIN_ID)).toBeNull();
  });

  it("resolves only the configured account id", () => {
    expect(findUserById(ADMIN_ID)).toMatchObject({ id: ADMIN_ID, role: "admin" });
    expect(findUserById("00000000-0000-0000-0000-000000000009")).toBeNull();
  });
});

describe("resolving a user from a request", () => {
  it("resolves the account for a valid session", async () => {
    await expect(sessionUserFromRequest(withCookie(issueSessionToken(ADMIN_ID)))).resolves
      .toMatchObject({ id: ADMIN_ID });
  });

  it("resolves nothing for an invalid session", async () => {
    await expect(sessionUserFromRequest(withCookie("forged.123.sig"))).resolves.toBeNull();
  });

  it("resolves nothing for an expired session", async () => {
    const expired = issueSessionToken(ADMIN_ID, Date.now() - SESSION_MAX_AGE * 1000 - 1);
    await expect(sessionUserFromRequest(withCookie(expired))).resolves.toBeNull();
  });

  it("resolves nothing once the cookie is cleared", async () => {
    // What the browser sends after logout: the cookie is gone entirely.
    const signedOut = new Request("https://app.example.com/api/internal-ai/chat", {
      method: "POST",
    });
    await expect(sessionUserFromRequest(signedOut)).resolves.toBeNull();
  });
});

describe("route classification", () => {
  it.each([
    "/dashboard",
    "/dashboard/clients",
    "/internal-ai",
    "/financial-statement-generator",
    "/net-settlement",
    "/onboarding/new",
    "/secure-email-generator",
  ])("opens the workspace page %s", (path) => {
    expect(isProtectedPage(path)).toBe(false);
    expect(requiresSession(path)).toBe(false);
  });

  it.each([
    "/api/internal-ai/chat",
    "/api/financial-statements/upload",
    "/api/clients",
    "/api/clients/123/context",
    "/api/onboarding",
    "/api/emails/1/send",
  ])("opens the workspace API %s", (path) => {
    expect(isProtectedApi(path)).toBe(false);
  });

  it.each([
    "/",
    "/login",
    "/about",
    "/contact",
    "/services",
    "/newsroom/some-article",
    "/compound-calculator",
    "/keybase-answer",
    "/people/j-leung",
    "/sign/onboarding/abc123",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/contact",
    "/api/careers",
    "/api/keybase-answer",
    "/api/mexico-trip/rsvp",
    "/api/website-admin-cms/login",
    "/api/content/session",
  ])("leaves the public path %s open", (path) => {
    expect(requiresSession(path)).toBe(false);
  });

  it("does not confuse /compound-interest with the public /compound-calculator", () => {
    expect(isProtectedPage("/compound-interest")).toBe(false);
    expect(isProtectedPage("/compound-calculator")).toBe(false);
  });

  it("matches on whole segments, not string prefixes", () => {
    // A public page whose name merely starts with a protected prefix.
    expect(isProtectedPage("/dashboard-public-brochure")).toBe(false);
    expect(isProtectedApi("/api/clientsomething")).toBe(false);
  });

  it("keeps external document signing open", () => {
    expect(isPublicException("/api/onboarding/sign/tok")).toBe(true);
    expect(isProtectedApi("/api/onboarding/sign/tok")).toBe(false);
    // The rest of onboarding is also public.
    expect(isProtectedApi("/api/onboarding/123/send")).toBe(false);
  });
});
