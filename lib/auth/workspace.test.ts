import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { getApiUser, getSessionUser, requireApiUser } from "@/lib/auth/guard";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/currentUser";

afterEach(() => vi.unstubAllEnvs());

describe("public workspace access", () => {
  it.each(["/dashboard", "/dashboard/clients", "/internal-ai", "/api/clients", "/api/internal-ai/chat"])(
    "allows anonymous production requests to %s without redirecting", (path) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("AUTH_SESSION_SECRET", "");
      const response = proxy(new NextRequest(`https://automation-web-red.vercel.app${path}`));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    }
  );
  it("uses a shared actor without credentials or cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SESSION_SECRET", "");
    vi.stubEnv("INTERNAL_ADMIN_PASSWORD_HASH", "");
    const request = new Request("https://example.com/api/clients");
    for (const actor of await Promise.all([
      getApiUser(request), requireApiUser(request), getSessionUser(),
      getCurrentUser(), getCurrentUserFromRequest(request),
    ])) {
      expect(actor).toMatchObject({ id: "00000000-0000-0000-0000-000000000001", name: "Shared workspace" });
    }
  });
});
