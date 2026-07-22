/**
 * Decimal-safe money handling for settlement reconciliation.
 *
 * Financial amounts are NEVER stored or compared as floating point. Everything
 * is represented as an integer number of minor units (cents). Parsing tolerates
 * the many ways amounts appear in Fundserv / Winfund exports:
 *   "5,000.00"  "$1,234.56"  "(50.00)" (brackets = negative)
 *   "1234.5-"   "100 DR"     "100 CR"   "1.000,50" (EU decimal comma)
 */

export type Currency = "CAD" | "USD";

/** Number of cents in one dollar. Both supported currencies use 2 decimals. */
const MINOR_UNITS = 100;

/**
 * Parse an arbitrary raw amount into integer cents. Returns null when the value
 * cannot be interpreted as a number (so callers can raise a mapping/parse
 * exception rather than silently inventing 0).
 */
export function parseAmountToCents(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;

  // A real number from a parsed spreadsheet cell — round to cents safely.
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return Math.round(raw * MINOR_UNITS);
  }

  let s = String(raw).trim();
  if (s === "") return null;

  let negative = false;

  // Bracketed negatives: (1,234.56)
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }

  // Trailing / leading debit-credit and sign markers.
  const upper = s.toUpperCase();
  if (/(^|\s)(DR|DEBIT)$/.test(upper)) negative = true; // debit reduces settlement
  if (/-\s*$/.test(s) || /^\s*-/.test(s)) negative = true;
  s = s.replace(/(CR|DR|CREDIT|DEBIT)$/i, "").trim();

  // Strip currency symbols/codes, spaces and signs; keep digits and separators.
  s = s.replace(/[$£€]/g, "").replace(/\b(CAD|USD)\b/gi, "").trim();
  s = s.replace(/[+\-]/g, "").trim();

  // Decide the decimal separator. If both '.' and ',' appear, the LAST one is
  // the decimal separator (handles 1,234.56 and 1.234,56).
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let decimalSep = "";
  if (lastDot >= 0 && lastComma >= 0) {
    decimalSep = lastDot > lastComma ? "." : ",";
  } else if (lastComma >= 0) {
    // Only commas — treat as decimal only when it looks like cents (,dd)
    decimalSep = /,\d{1,2}$/.test(s) ? "," : "";
  } else if (lastDot >= 0) {
    decimalSep = ".";
  }

  let intPart = s;
  let fracPart = "";
  if (decimalSep) {
    const idx = s.lastIndexOf(decimalSep);
    intPart = s.slice(0, idx);
    fracPart = s.slice(idx + 1);
  }

  intPart = intPart.replace(/[^\d]/g, "");
  fracPart = fracPart.replace(/[^\d]/g, "");
  if (intPart === "" && fracPart === "") return null;

  // Normalise fractional part to exactly 2 digits without float math.
  const cents2 = (fracPart + "00").slice(0, 2);
  const cents =
    Number(intPart || "0") * MINOR_UNITS + Number(cents2 || "0");
  if (!Number.isFinite(cents)) return null;

  return negative ? -cents : cents;
}

/** Format integer cents as a fixed-2 decimal string, e.g. -500000 -> "-5000.00". */
export function formatCents(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / MINOR_UNITS);
  const rem = abs % MINOR_UNITS;
  return `${neg ? "-" : ""}${dollars}.${String(rem).padStart(2, "0")}`;
}

/** Format for display with thousands separators, e.g. "-5,000.00". */
export function formatMoney(cents: number, currency?: Currency): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / MINOR_UNITS);
  const rem = abs % MINOR_UNITS;
  const grouped = dollars.toLocaleString("en-CA");
  const body = `${grouped}.${String(rem).padStart(2, "0")}`;
  return `${neg ? "-" : ""}${currency ? currency + " " : ""}${body}`;
}

/** Sum a list of cent values (exact integer arithmetic). */
export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
