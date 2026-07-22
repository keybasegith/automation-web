/**
 * Deterministic normalization rules (spec §"NORMALIZED TRANSACTION").
 *
 * Scope: Canadian Dollar, Buy Shares and Sell of Shares only. Cash Distribution,
 * Commission and Deposits are out of scope and normalize to null (excluded).
 * Amounts are integer cents; normalized amount is always the absolute value.
 */

import type { TransactionType } from "./types";

/**
 * Map a raw transaction-type label to BUY_SHARES / SELL_SHARES, or null when it
 * is out of scope (cash distribution, commission, deposit, unknown).
 */
export function normalizeTransactionType(raw: unknown): TransactionType | null {
  if (raw === null || raw === undefined) return null;
  const u = String(raw).trim().toUpperCase();
  if (u === "") return null;

  // Out of scope — must be excluded, never coerced into Buy/Sell.
  if (/\b(CASH\s*DISTRIB|DISTRIBUTION|DIVIDEND|COMMISSION|COMM|DEPOSIT)\b/.test(u)) return null;

  if (/\b(BUY|PURCHASE|PUR|SUBSCRIPTION|SUBSCRIBE)\b/.test(u)) return "BUY_SHARES";
  if (/\b(SELL|SALE|REDEMPTION|REDEEM|RED|WITHDRAW|WITHDRAWAL)\b/.test(u)) return "SELL_SHARES";
  return null;
}

/**
 * Normalize a signed cents amount for comparison. Winfund frequently stores Buys
 * as negative values; the negative sign is a convention, not an error — the
 * normalized amount is the absolute value.
 */
export function normalizeAmount(originalCents: number): number {
  return Math.abs(originalCents);
}

/** Detect a currency token. Only CAD is processed; USD is excluded. */
export function detectCurrency(raw: unknown): "CAD" | "USD" | "UNKNOWN" {
  if (raw === null || raw === undefined) return "UNKNOWN";
  const u = String(raw).trim().toUpperCase();
  if (u === "") return "UNKNOWN";
  if (/\b(USD|US\s*DOLLAR|AMERICAN\s*DOLLAR|U\.S\.)\b/.test(u) || u === "US") return "USD";
  if (/\b(CAD|CDN|CANADIAN\s*DOLLAR|C\$)\b/.test(u) || u === "CA") return "CAD";
  return "UNKNOWN";
}

/** USD rows are excluded; CAD/unknown (single-currency export) are processed. */
export function isCanadianDollar(raw: unknown): boolean {
  return detectCurrency(raw) !== "USD";
}

/** A Winfund settlement status that means the row is still Not Settled. */
export function isNotSettled(raw: unknown): boolean {
  if (raw === null || raw === undefined) return false;
  const s = String(raw).trim().toLowerCase();
  if (s === "") return false;
  return /(not\s*settled|unsettled|^open$|pending)/.test(s);
}
