import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

/**
 * Password hashing for content accounts.
 *
 * scrypt from Node's own crypto — no dependency, and the parameters are stored
 * in the hash string so they can be raised later without invalidating existing
 * passwords. Format:
 *
 *   scrypt$N$r$p$<salt base64>$<hash base64>
 *
 * These parameters must stay in step with scripts/migrate-content-schema.mjs,
 * which seeds the first admin account before the app can run.
 */

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };
const maxmem = 128 * PARAMS.N * PARAMS.r * 2;

/** Unicode-normalize so the same typed password always hashes the same way. */
function prepare(plain: string): string {
  return plain.normalize("NFKC");
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(prepare(plain), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/**
 * Constant-time verification. Returns false for anything malformed rather than
 * throwing — a corrupt hash column must read as "wrong password", never as a
 * 500 that tells an attacker the account exists.
 */
export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
      return false;
    }

    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await scrypt(prepare(plain), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 128 * N * r * 2,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Minimum password rules for a new account. Deliberately short: length is what
 * matters, and a composition rule that rejects a long passphrase makes things
 * worse. Returns a message to show, or null when acceptable.
 */
export function passwordProblem(plain: string): string | null {
  if (prepare(plain).length < 10) {
    return "Password must be at least 10 characters.";
  }
  if (plain.length > 200) return "Password must be 200 characters or fewer.";
  return null;
}
