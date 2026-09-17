import { verifyPassword } from "@/lib/content/password";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Who may sign in to the automation dashboard.
 *
 * INTERIM MECHANISM — pending company SSO.
 * ----------------------------------------
 * The dashboard has no user table of its own (supabase/schema.sql seeds rows
 * for audit attribution, not for sign-in), so this is a single internal
 * account configured entirely from the server environment:
 *
 *   INTERNAL_ADMIN_EMAIL
 *   INTERNAL_ADMIN_PASSWORD_HASH   (scrypt; generate with npm run auth:hash)
 *
 * No credential is stored in source, no password is stored in plaintext
 * anywhere, and neither variable is prefixed NEXT_PUBLIC_, so neither can
 * reach a browser bundle. Password verification reuses lib/content/password.ts
 * — the repository's existing scrypt implementation — rather than introducing
 * a second one.
 *
 * When SSO arrives, this file is what it replaces: `findUserById` and
 * `verifyCredentials` are the only two functions the rest of the system calls,
 * and the session layer above them does not care where a user came from.
 */

/**
 * Stable id for the configured account. The session token carries this, so it
 * must not change between deploys or every live session would be invalidated.
 * It matches the seeded admin row in supabase/schema.sql, which keeps existing
 * audit-log foreign keys satisfied.
 */
const INTERNAL_ADMIN_ID = "00000000-0000-0000-0000-000000000001";

const DEFAULT_ADMIN_EMAIL = "admin@keybase.com";

/**
 * Development-only fallback credential.
 *
 * With no environment configured, `npm run dev` still signs in with the
 * long-standing local password so the rest of the dashboard stays workable.
 * It is refused outright when NODE_ENV is production — a deployment that has
 * not been configured cannot be signed into at all, rather than being
 * signed into with a password that is written down in this file.
 */
const DEV_FALLBACK_PASSWORD = "12345";

/** A well-formed scrypt hash of a value nobody knows. See `verifyCredentials`. */
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const isProduction = () => process.env.NODE_ENV === "production";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

function configuredEmail(): string {
  return normalizeEmail(process.env.INTERNAL_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL);
}

function configuredHash(): string | null {
  const hash = process.env.INTERNAL_ADMIN_PASSWORD_HASH?.trim();
  return hash ? hash : null;
}

function internalAdmin(): SessionUser {
  return {
    id: INTERNAL_ADMIN_ID,
    email: configuredEmail(),
    role: "admin",
    name: "Admin",
  };
}

/**
 * Resolve the user a session token points at.
 *
 * Every protected request calls this, so an account that stops being
 * configured stops being able to act, even while a signed token is still in
 * date — the closest thing to revocation a stateless session has.
 */
export function findUserById(userId: string): SessionUser | null {
  if (userId !== INTERNAL_ADMIN_ID) return null;
  if (isProduction() && !configuredHash()) return null;
  return internalAdmin();
}

export interface CredentialResult {
  ok: boolean;
  user?: SessionUser;
}

/**
 * Check an email and password.
 *
 * An unknown email and a wrong password are indistinguishable: both return the
 * same result, and an unknown email still runs a full scrypt comparison
 * against a dummy hash so response timing does not reveal which addresses have
 * accounts.
 */
export async function verifyCredentials(
  email: unknown,
  password: unknown
): Promise<CredentialResult> {
  if (typeof email !== "string" || typeof password !== "string") {
    return { ok: false };
  }

  const hash = configuredHash();

  // Unconfigured production: no account exists, but still pay the hashing cost
  // so an unconfigured deployment is not detectable from response timing.
  if (!hash && isProduction()) {
    await verifyPassword(password, DUMMY_HASH);
    return { ok: false };
  }

  const emailMatches = normalizeEmail(email) === configuredEmail();

  if (!hash) {
    // Development fallback. Still constant-work: the dummy comparison runs
    // whenever the email is wrong.
    if (!emailMatches) {
      await verifyPassword(password, DUMMY_HASH);
      return { ok: false };
    }
    return password === DEV_FALLBACK_PASSWORD
      ? { ok: true, user: internalAdmin() }
      : { ok: false };
  }

  const matches = await verifyPassword(password, emailMatches ? hash : DUMMY_HASH);
  if (!emailMatches || !matches) return { ok: false };
  return { ok: true, user: internalAdmin() };
}

/**
 * Whether sign-in is configured for this deployment. Surfaced in the server
 * log at login time so an unconfigured production deployment is obvious.
 */
export function isAuthConfigured(): boolean {
  return configuredHash() !== null;
}
