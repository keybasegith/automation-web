/**
 * GL account normalization.
 *
 * A Trial Balance account carries meaning in its suffix: `1101-K` is the
 * Commission Payable control account, `1101-K-00008` is one representative's
 * sub-account, and `3100-K-I` is a different intercompany party from
 * `3100-K-P`. The raw code is therefore never destroyed — it is decomposed, and
 * mapping rules match against named parts rather than against an uncontrolled
 * substring.
 *
 * The base GL code is the leading digit run and nothing else. Matching on it is
 * exact, which is what makes `BASE_GL_CODE` safe: a prefix match for "1000"
 * would also swallow "10001", and this cannot.
 */

export interface NormalizedAccount {
  /** Exactly what the source file contained. */
  rawAccountCode: string;
  /** Upper-cased, separators unified to "-", surrounding noise removed. */
  normalizedFullCode: string;
  /** The leading digit run, e.g. "1101". */
  baseGlCode: string;
  /** All hyphen-delimited parts, e.g. ["1101", "K", "00008"]. */
  segments: readonly string[];
  /** Second segment when present — the company in this chart of accounts. */
  companyCode: string | null;
  /** Everything after the company, joined — "" when there is no sub-account. */
  subAccount: string;
}

/**
 * Normalize one account code, or return null when it is not an account at all
 * (a total line, a page footer, a stray label). A null result is never guessed
 * at downstream; it becomes an `invalid_account` exception.
 */
export function normalizeAccountCode(raw: string): NormalizedAccount | null {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const normalizedFullCode = trimmed
    .toUpperCase()
    .replace(/[\s_/]+/g, "-") // "1000 K" and "1000_K" are the same account
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalizedFullCode === "") return null;

  const segments = normalizedFullCode.split("-");
  const baseGlCode = segments[0];

  // The base must be digits only. "Total:" stops here.
  if (!/^\d{1,8}$/.test(baseGlCode)) return null;

  // Sub-account segments are short alphanumeric tokens ("K", "I", "CIG",
  // "00008", "0431B"). Bounding their length is what stops a line of report
  // prose — "163 accounts printed" — from being read as account 163. A genuine
  // code with a longer segment is rejected here and surfaces as an
  // invalid_account exception, which is the safe direction to fail in.
  if (segments.slice(1).some((segment) => !/^[A-Z0-9]{1,6}$/.test(segment))) return null;

  return {
    rawAccountCode: raw,
    normalizedFullCode,
    baseGlCode,
    segments,
    companyCode: segments.length > 1 ? segments[1] : null,
    subAccount: segments.slice(2).join("-"),
  };
}

/**
 * The base code as a number, for `NUMERIC_RANGE` comparison. Returns null when
 * the base will not fit a safe integer, which no real GL code does.
 */
export function baseGlCodeAsNumber(account: NormalizedAccount): number | null {
  const value = Number(account.baseGlCode);
  return Number.isSafeInteger(value) ? value : null;
}
