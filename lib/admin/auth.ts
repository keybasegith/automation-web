import { createHash } from "crypto";

/**
 * Lightweight session auth for the website ERP (/admin).
 *
 * Staff sign in with an email + password from the ADMIN_USERS allow-list below.
 * On success the server sets an httpOnly cookie holding an opaque token derived
 * from that user's credentials, and every mutating admin API route verifies the
 * cookie against the list. This is deliberately separate from the automation
 * dashboard's login so the two ERPs stay independent.
 *
 * To grant access to more people later, just add entries to ADMIN_USERS.
 */

export const ADMIN_COOKIE_NAME = "kb_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

export interface AdminUser {
  email: string;
  password: string;
}

// -- Authorized ERP users ---------------------------------------------------
// Add more { email, password } entries here to grant additional people access.
const ADMIN_USERS: AdminUser[] = [
  { email: "krissy.sukhraj@keybase.com", password: "12345" },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Extra salt for the session token. Optional; has a safe default. */
function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "kb-admin-session-secret";
}

/**
 * Opaque per-user token stored in the cookie. Derived from the user's
 * credentials, so changing or removing a user invalidates their old sessions.
 */
function tokenFor(user: AdminUser): string {
  return createHash("sha256")
    .update(`kb-admin::${normalizeEmail(user.email)}::${user.password}::${sessionSecret()}`)
    .digest("hex");
}

/** Validate an email + password against the allow-list. */
export function verifyCredentials(
  email: unknown,
  password: unknown
): AdminUser | null {
  if (typeof email !== "string" || typeof password !== "string") return null;
  const wanted = normalizeEmail(email);
  return (
    ADMIN_USERS.find(
      (u) => normalizeEmail(u.email) === wanted && u.password === password
    ) ?? null
  );
}

/** The session token to store for a validated user. */
export function sessionTokenFor(user: AdminUser): string {
  return tokenFor(user);
}

/** Read the raw admin session token off an incoming request, if present. */
function tokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const prefix = `${ADMIN_COOKIE_NAME}=`;
  const entry = cookieHeader.split(/;\s*/).find((c) => c.startsWith(prefix));
  if (!entry) return null;

  return decodeURIComponent(entry.slice(prefix.length));
}

/** Read the admin cookie off an incoming request and check it's valid. */
export function requestHasAdminSession(req: Request): boolean {
  return adminUserFromRequest(req) !== null;
}

/**
 * The signed-in admin's email for an authenticated request, or null. Used to
 * attribute audit-log entries and "published by" fields to a real person.
 */
export function adminUserFromRequest(req: Request): string | null {
  const value = tokenFromRequest(req);
  if (!value) return null;
  const user = ADMIN_USERS.find((u) => tokenFor(u) === value);
  return user ? normalizeEmail(user.email) : null;
}
