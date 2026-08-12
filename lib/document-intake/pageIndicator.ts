/**
 * Parsing for the "Page 1 of 3" style stamps Keybase forms print in the
 * bottom margin of every page.
 *
 * This is the single most reliable boundary signal we have: it is printed by
 * the form itself, it is per-instance (a KYC Update that ships as 2 pages
 * stamps "of 2", the 3-page variant stamps "of 3"), and it survives OCR far
 * better than a form code in a corner. `groupPages` treats it as ground truth
 * and only falls back to the catalog's `expectedPageCount` when no stamp was
 * found.
 */

export interface PageIndicator {
  /** 1-based position of this page within its document. */
  index: number;
  /** Total pages the stamp claims the document has. */
  total: number;
}

/** Reject absurd stamps — real forms are well under this. */
const MAX_REASONABLE_TOTAL = 99;

/**
 * Ordered by trust. An explicit "Page"/"Pg"/"Page … sur" keyword is much
 * harder to hit by accident than a bare "1 of 3", so a keyword match always
 * wins over a bare one regardless of position on the page.
 *
 * `sur` / `de` cover the French side of the bilingual Canadian forms.
 */
const PATTERNS: Array<{ re: RegExp; keyword: boolean }> = [
  // "Page 1 of 3", "Page 1 sur 3", "Page 1 de 3"
  {
    re: /\bp(?:age|g)\.?\s*(\d{1,2})\s*(?:of|sur|de)\s*(\d{1,2})\b/gi,
    keyword: true,
  },
  // "Page 1/3", "Pg 1 / 3"
  { re: /\bp(?:age|g)\.?\s*(\d{1,2})\s*\/\s*(\d{1,2})\b/gi, keyword: true },
  // "1 of 3" with no keyword — weakest, easy to hit inside body prose.
  { re: /\b(\d{1,2})\s*(?:of|sur)\s*(\d{1,2})\b/gi, keyword: false },
];

function isPlausible(index: number, total: number): boolean {
  return (
    Number.isInteger(index) &&
    Number.isInteger(total) &&
    total >= 1 &&
    total <= MAX_REASONABLE_TOTAL &&
    index >= 1 &&
    index <= total
  );
}

/**
 * Find a page-position stamp in `text`.
 *
 * Callers should pass the footer band only. Passing whole-page text works but
 * is much more prone to false positives (body copy like "select 1 of 3
 * options"), so `classifyDocumentPage` only does that for OCR'd pages where
 * band information was lost.
 *
 * When several stamps match, a keyword-form match ("Page 2 of 3") beats a
 * bare one ("2 of 3"); ties are broken by taking the last match, which on a
 * two-column footer is the one nearest the page edge.
 */
export function parsePageIndicator(
  text: string | undefined | null
): PageIndicator | undefined {
  if (!text) return undefined;

  let best: PageIndicator | undefined;
  let bestIsKeyword = false;

  for (const { re, keyword } of PATTERNS) {
    // Regexes are module-level and `g`-flagged — reset before each scan.
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const index = Number(match[1]);
      const total = Number(match[2]);
      if (!isPlausible(index, total)) continue;
      // A keyword match can replace a bare one, but never the reverse.
      if (best && bestIsKeyword && !keyword) continue;
      best = { index, total };
      bestIsKeyword = keyword;
    }
  }

  return best;
}

/**
 * True when `next` reads as the page immediately after `prev` within the same
 * document — same claimed total, and the index advanced by exactly one.
 */
export function indicatorsAreConsecutive(
  prev: PageIndicator | undefined,
  next: PageIndicator | undefined
): boolean {
  if (!prev || !next) return false;
  return next.total === prev.total && next.index === prev.index + 1;
}
