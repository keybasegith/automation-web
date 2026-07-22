import { describe, it, expect } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  adminUserFromRequest,
  requestHasAdminSession,
  sessionTokenFor,
  verifyCredentials,
} from "@/lib/admin/auth";

/**
 * Auth is the gate on every admin mutation, so verify that a request with no /
 * bad cookie is rejected and a valid cookie is attributed to the right user.
 */

function reqWithCookie(value?: string): Request {
  return new Request("http://localhost/api/admin/cms/footer", {
    headers: value ? { cookie: `${ADMIN_COOKIE_NAME}=${value}` } : {},
  });
}

describe("admin auth", () => {
  it("rejects requests with no session cookie", () => {
    const req = reqWithCookie();
    expect(requestHasAdminSession(req)).toBe(false);
    expect(adminUserFromRequest(req)).toBeNull();
  });

  it("rejects a forged/invalid token", () => {
    const req = reqWithCookie("not-a-real-token");
    expect(requestHasAdminSession(req)).toBe(false);
    expect(adminUserFromRequest(req)).toBeNull();
  });

  it("accepts a valid token and attributes it to the user", () => {
    const user = verifyCredentials("krissy.sukhraj@keybase.com", "12345");
    expect(user).not.toBeNull();
    const token = sessionTokenFor(user!);
    const req = reqWithCookie(token);
    expect(requestHasAdminSession(req)).toBe(true);
    expect(adminUserFromRequest(req)).toBe("krissy.sukhraj@keybase.com");
  });
});
