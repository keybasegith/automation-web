/**
 * Money for the Financial Statement Generator.
 *
 * Every monetary value in this feature is an integer number of cents carried in
 * a `bigint`. Floating point never touches an accounting figure: a Trial
 * Balance running to eight figures has to reconcile to the cent, and IEEE-754
 * doubles cannot promise that after a few hundred additions.
 *
 * Cents become a decimal exactly once, at the presentation/export boundary
 * (`centsToNumber`, `formatCents`). Nothing upstream of that is allowed to.
 */

export interface MoneyParseResult {
  ok: boolean;
  cents: bigint;
  /** The source cell held nothing at all — distinct from an explicit zero. */
  isBlank: boolean;
  /** Populated only when `ok` is false; safe to show to a finance user. */
  reason?: string;
}

const ok = (cents: bigint, isBlank = false): MoneyParseResult => ({ ok: true, cents, isBlank });
const bad = (reason: string): MoneyParseResult => ({ ok: false, cents: 0n, isBlank: false, reason });

/**
 * Convert a plain decimal string (already sign-stripped) to cents, rounding
 * half away from zero — the convention accountants expect, and the one Excel
 * uses for display.
 */
function decimalStringToCents(digits: string, negative: boolean): MoneyParseResult {
  if (!/^\d*(\.\d*)?$/.test(digits)) return bad(`"${digits}" is not a number.`);
  if (!/\d/.test(digits)) return bad("No digits found.");

  const [whole, fraction = ""] = digits.split(".");
  const centsPart = (fraction + "00").slice(0, 2);
  let cents = BigInt(whole || "0") * 100n + BigInt(centsPart);

  // Round on the third decimal rather than truncating, so 1.005 -> 1.01.
  if (fraction.length > 2 && Number(fraction[2]) >= 5) cents += 1n;

  return ok(negative ? -cents : cents);
}

/**
 * Expand a JS number to a plain decimal string without exponent notation.
 * `String(n)` already gives the shortest round-trip form, which for a 2-decimal
 * accounting value is exactly the decimal the source intended.
 */
function numberToDecimalString(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  const s = String(Math.abs(value));
  if (!s.includes("e") && !s.includes("E")) return s;

  // Exponent form (very large/small). Rebuild it digit by digit.
  const [mantissa, expPart] = s.split(/[eE]/);
  const exp = Number(expPart);
  const [mWhole, mFraction = ""] = mantissa.split(".");
  const allDigits = mWhole + mFraction;
  const pointAt = mWhole.length + exp;
  if (pointAt <= 0) return "0." + "0".repeat(-pointAt) + allDigits;
  if (pointAt >= allDigits.length) return allDigits + "0".repeat(pointAt - allDigits.length);
  return allDigits.slice(0, pointAt) + "." + allDigits.slice(pointAt);
}

/**
 * Parse a Trial Balance money cell.
 *
 * Accepts what real exports actually contain: plain numbers, thousands
 * separators, a currency symbol, parentheses for negatives, and the trailing
 * minus that mainframe and Sage reports still emit. Anything it cannot read
 * with certainty is rejected rather than guessed — a misread amount is worse
 * than a blocked import.
 */
export function parseMoneyToCents(value: unknown): MoneyParseResult {
  if (value === null || value === undefined) return ok(0n, true);

  if (typeof value === "bigint") return ok(value);

  if (typeof value === "number") {
    const decimal = numberToDecimalString(value);
    if (decimal === null) return bad(`"${value}" is not a finite number.`);
    return decimalStringToCents(decimal, value < 0 || Object.is(value, -0));
  }

  if (typeof value !== "string") return bad(`Cannot read a ${typeof value} as an amount.`);

  let text = value.replace(/ /g, " ").trim();
  if (text === "") return ok(0n, true);
  // A lone dash is how many reports render "nothing here".
  if (/^[-–—]$/.test(text)) return ok(0n, true);

  let negative = false;

  // Strip currency and separators first: Excel's accounting format emits
  // "$ (1,234.56)", where the symbol sits outside the parentheses.
  text = text.replace(/[$\s,]/g, "");
  if (/^(CAD|USD)/i.test(text)) text = text.replace(/^(CAD|USD)/i, "");

  // Parentheses: (1234.56)
  const parenthesised = /^\((.*)\)$/.exec(text);
  if (parenthesised) {
    negative = true;
    text = parenthesised[1];
  }

  // Trailing minus: 1234.56-
  if (/-$/.test(text)) {
    negative = !negative;
    text = text.slice(0, -1);
  }
  // Leading minus.
  if (/^-/.test(text)) {
    negative = !negative;
    text = text.slice(1);
  }

  if (text === "") return bad(`"${value}" contains no amount.`);
  const result = decimalStringToCents(text, negative);
  return result.ok ? result : bad(`"${value}" is not a valid amount.`);
}

/** Sum without an intermediate float anywhere. */
export function sumCents(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const v of values) total += v;
  return total;
}

export const subtractCents = (a: bigint, b: bigint): bigint => a - b;
export const negateCents = (a: bigint): bigint => -a;
export const absCents = (a: bigint): bigint => (a < 0n ? -a : a);

/**
 * The one place cents become a JS number, for Excel cells and JSON responses.
 * Exact for every value inside Number.MAX_SAFE_INTEGER (±90 trillion dollars),
 * which no trial balance this tool will ever see comes close to.
 */
export function centsToNumber(cents: bigint): number {
  if (absCents(cents) > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`Amount ${cents} is too large to represent exactly.`);
  }
  return Number(cents) / 100;
}

export interface FormatCentsOptions {
  /** Render negatives as (1,234.56) rather than -1,234.56. */
  parentheses?: boolean;
  /** Prefix a dollar sign. */
  currency?: boolean;
  /** Render exact zero as "-" (accounting dash). */
  dashForZero?: boolean;
}

/** Present cents as a fixed 2-decimal, thousands-separated string. */
export function formatCents(cents: bigint, options: FormatCentsOptions = {}): string {
  if (cents === 0n && options.dashForZero) return "-";

  const negative = cents < 0n;
  const magnitude = absCents(cents);
  const whole = (magnitude / 100n).toString();
  const fraction = (magnitude % 100n).toString().padStart(2, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const body = `${options.currency ? "$" : ""}${grouped}.${fraction}`;
  if (!negative) return body;
  return options.parentheses ? `(${body})` : `-${body}`;
}

/** Serialise cents for a JSON payload. bigint is not JSON-representable. */
export const centsToJson = (cents: bigint): string => cents.toString();
export const centsFromJson = (value: string | number | bigint): bigint => BigInt(value);
