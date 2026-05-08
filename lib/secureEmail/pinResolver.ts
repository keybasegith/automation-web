import { createHash } from "node:crypto";
import { getServerSupabase } from "@/lib/supabaseClient";

/**
 * PIN-to-employee resolver for the secure email "Approve & send" flow.
 *
 * Each employee enrols a 4-8 digit PIN; the hash (sha256(pin || salt)) is
 * stored in `compliance_pins`. To approve a send the advisor enters their
 * PIN — the server scans every row, recomputes the hash with that row's
 * salt, and returns the matching user.
 *
 * The raw PIN is never logged, never stored, and never returned to the
 * caller. Only the resolved user (id, email, name) crosses the function
 * boundary.
 */

export interface ResolvedSender {
  id: string;
  email: string;
  /**
   * The display name used to substitute [Advisor Name] in the email body.
   * Falls back to a title-cased local part of the email if a name has not
   * been set on the user record.
   */
  name: string;
}

const sha256Hex = (input: string): string =>
  createHash("sha256").update(input).digest("hex");

const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

const titleCaseLocalPart = (email: string): string => {
  const local = email.split("@")[0] ?? "";
  return (
    local
      .replace(/[._-]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ") || "Advisor"
  );
};

interface PinRow {
  user_id: string;
  pin_hash: string;
  pin_salt: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
}

export async function resolveUserByPin(
  candidatePin: string
): Promise<ResolvedSender | null> {
  if (typeof candidatePin !== "string") return null;
  if (!/^\d{4,8}$/.test(candidatePin)) return null;

  const supabase = getServerSupabase();
  const { data: pinRows, error: pinErr } = await supabase
    .from("compliance_pins")
    .select("user_id, pin_hash, pin_salt");
  if (pinErr) {
    throw new Error(`PIN lookup failed: ${pinErr.message}`);
  }
  if (!pinRows || pinRows.length === 0) return null;

  let matchedUserId: string | null = null;
  for (const row of pinRows as PinRow[]) {
    const candidateHash = sha256Hex(`${candidatePin}${row.pin_salt}`);
    if (constantTimeEqual(candidateHash, row.pin_hash)) {
      matchedUserId = row.user_id;
      break;
    }
  }
  if (!matchedUserId) return null;

  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", matchedUserId)
    .maybeSingle();
  if (userErr) {
    throw new Error(`User lookup failed: ${userErr.message}`);
  }
  if (!userRow) return null;
  const u = userRow as UserRow;
  return {
    id: u.id,
    email: u.email,
    name: u.name?.trim() || titleCaseLocalPart(u.email),
  };
}
