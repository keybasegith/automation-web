import { afterEach, beforeEach, beforeAll, expect, it, vi } from "vitest";
import { hashPassword } from "@/lib/content/password";
import { verifyCredentials, sessionTokenFor, isValidSessionToken, adminUserFromRequest, ADMIN_COOKIE_NAME } from "./auth";
let passwordHash:string;
beforeAll(async()=>{passwordHash=await hashPassword("local-test-password-only");});
beforeEach(()=>{vi.stubEnv("CMS_ADMIN_EMAIL","admin@example.test");vi.stubEnv("CMS_ADMIN_PASSWORD_HASH",passwordHash);vi.stubEnv("ADMIN_SESSION_SECRET","test-only-secret-with-more-than-32-characters");});
afterEach(()=>{vi.unstubAllEnvs();vi.useRealTimers();});
it("fails closed without configured credentials or a strong secret",async()=>{
 vi.stubEnv("ADMIN_SESSION_SECRET","");expect(await verifyCredentials("admin@example.test","local-test-password-only")).toBeNull();expect(isValidSessionToken("forged")).toBe(false);
});
it("accepts valid credentials and rejects incorrect passwords",async()=>{
 expect(await verifyCredentials("admin@example.test","wrong")).toBeNull();
 const user=await verifyCredentials("admin@example.test","local-test-password-only");expect(user).not.toBeNull();
 const token=sessionTokenFor(user!);expect(isValidSessionToken(token)).toBe(true);
 expect(adminUserFromRequest(new Request("https://www.keybase.com",{headers:{cookie:`${ADMIN_COOKIE_NAME}=${token}`}}))).toBe("admin@example.test");
 expect(isValidSessionToken(token.slice(0,-1)+(token.endsWith("a")?"b":"a"))).toBe(false);
});
it("expires sessions on the server and revokes on secret rotation",async()=>{
 vi.useFakeTimers();const user=await verifyCredentials("admin@example.test","local-test-password-only");const token=sessionTokenFor(user!);
 vi.setSystemTime(Date.now()+12*60*60*1000);expect(isValidSessionToken(token)).toBe(false);
 vi.useRealTimers();vi.stubEnv("ADMIN_SESSION_SECRET","a-different-test-secret-over-32-characters");expect(isValidSessionToken(token)).toBe(false);
});
it("rejects missing and malformed cookies without throwing",()=>{
 expect(adminUserFromRequest(new Request("https://www.keybase.com"))).toBeNull();
 expect(adminUserFromRequest(new Request("https://www.keybase.com",{headers:{cookie:`${ADMIN_COOKIE_NAME}=%XX`}}))).toBeNull();
});
