import { createHash, randomBytes } from "node:crypto";
import { getServerSupabase } from "@/lib/supabaseClient";

/**
 * Compliance approval PIN handling.
 *
 * IMPORTANT: this is a demo-grade implementation. Production should use
 * bcrypt/argon2 with per-user salts derived from a secrets manager.
 * The app deliberately never stores or returns the raw PIN.
 */

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function buildHash(pin: string, salt: string): string {
  return sha256Hex(`${pin}${salt}`);
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export interface PinRow {
  user_id: string;
  pin_hash: string;
  pin_salt: string;
  updated_at: string;
}

export async function setComplianceUserPin(
  userId: string,
  pin: string
): Promise<void> {
  if (!/^\d{4,8}$/.test(pin)) {
    throw new Error("PIN must be 4-8 digits.");
  }
  const supabase = getServerSupabase();
  const salt = newSalt();
  const pin_hash = buildHash(pin, salt);
  const { error } = await supabase
    .from("compliance_pins")
    .upsert({ user_id: userId, pin_hash, pin_salt: salt }, { onConflict: "user_id" });
  if (error) {
    throw new Error(`Could not store PIN: ${error.message}`);
  }
}

/**
 * Returns true iff the candidate PIN matches the stored hash for the user.
 * Constant-time-ish comparison via Buffer length-equal + mismatch counter.
 */
export async function verifyComplianceUserPin(
  userId: string,
  candidate: string
): Promise<boolean> {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("compliance_pins")
    .select("pin_hash, pin_salt")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(`PIN lookup failed: ${error.message}`);
  }
  if (!data) return false;
  const candidateHash = buildHash(candidate, data.pin_salt as string);
  const storedHash = data.pin_hash as string;
  if (candidateHash.length !== storedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    mismatch |= candidateHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return mismatch === 0;
}
