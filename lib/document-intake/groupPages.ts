import {
  CORE_DOCUMENT_REQUIREMENTS,
  findCatalogItemByName,
} from "./documentCatalog";
import { indicatorsAreConsecutive } from "./pageIndicator";
import {
  UNSURE_DOCUMENT_NAME,
  type ClassificationSource,
  type DocumentGroup,
  type DocumentGroupStatus,
  type PageClassification,
} from "./types";

const NEEDS_REVIEW_THRESHOLD = 85;

const SOURCE_RANK: Record<ClassificationSource, number> = {
  manual: 4,
  ai: 3,
  keyword: 2,
  fallback: 1,
};

function deriveStatus(args: {
  documentName: string;
  averageConfidence: number;
  anyPageNeedsReview: boolean;
}): DocumentGroupStatus {
  if (args.documentName === UNSURE_DOCUMENT_NAME) return "Unsure";
  if (args.documentName === "Unknown") return "Unknown";
  if (args.averageConfidence < 60) return "Low Confidence";
  if (args.averageConfidence < NEEDS_REVIEW_THRESHOLD || args.anyPageNeedsReview) {
    return "Needs Review";
  }
  return "Ready";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `grp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function safeFileSegment(value: string): string {
  return value
    .trim()
    .replace(/[/\\:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

interface FilenameVariables {
  clientName: string;
  clientId?: string;
  advisorName?: string;
  documentName: string;
  documentCode?: string;
  category: string;
  startPage: number;
  endPage: number;
  date: string;
}

export const DEFAULT_FILENAME_TEMPLATE =
  "{clientName}_{documentName}_{documentCode}_Pages_{startPage}-{endPage}.pdf";

/**
 * Render a filename template with the given variables.
 *
 * - Empty/undefined variables are replaced with empty string.
 * - Resulting double underscores are collapsed.
 * - The result is sanitized (invalid characters stripped) but spaces are
 *   PRESERVED unless the caller passes auto-format upstream.
 * - The template's `.pdf` (or any other extension) is preserved literally.
 */
export function renderFilenameTemplate(
  template: string,
  vars: FilenameVariables,
  opts?: { autoFormat?: boolean }
): string {
  const map: Record<string, string> = {
    clientName: vars.clientName,
    clientId: vars.clientId ?? "",
    advisorName: vars.advisorName ?? "",
    documentName: vars.documentName,
    documentCode: vars.documentCode ?? "",
    category: vars.category,
    startPage: String(vars.startPage),
    endPage: String(vars.endPage),
    date: vars.date,
  };

  let out = template.replace(/\{(\w+)\}/g, (_, key: string) =>
    Object.prototype.hasOwnProperty.call(map, key) ? map[key] : ""
  );

  // Strip illegal filename characters.
  out = out.replace(/[/\\:*?"<>|]+/g, "");

  if (opts?.autoFormat) {
    out = out.replace(/\s+/g, "_");
  }

  // Collapse double-underscores caused by empty variables (only — keep
  // intentional underscores).
  out = out.replace(/_+/g, "_").replace(/_-_/g, "-");
  // Trim leading/trailing junk between the name and extension.
  out = out.replace(/_+(\.pdf)/i, "$1").replace(/^_+/, "").replace(/-_/g, "-");
  if (!/\.pdf$/i.test(out)) out += ".pdf";
  return out;
}

/**
 * Build the auto/suggested filename for a group from the default template.
 */
export function buildSuggestedFileName(args: {
  clientName: string;
  clientId?: string;
  advisorName?: string;
  documentName: string;
  documentCode?: string;
  category: string;
  startPage: number;
  endPage: number;
}): string {
  // Auto-format ON by default for the *suggested* filename — the employee
  // can always switch to spaces by editing the field directly.
  return renderFilenameTemplate(
    DEFAULT_FILENAME_TEMPLATE,
    {
      ...args,
      date: new Date().toISOString().slice(0, 10),
    },
    { autoFormat: true }
  );
}

interface BuildGroupArgs {
  clientName: string;
  clientId?: string;
  advisorName?: string;
}

function bestSource(pages: PageClassification[]): ClassificationSource {
  let best: ClassificationSource = "fallback";
  for (const p of pages) {
    if (SOURCE_RANK[p.source] > SOURCE_RANK[best]) best = p.source;
  }
  return best;
}

/**
 * Resolve the catalog's expectedPageCount for a documentName. Returns the
 * maximum allowed page count for the group; undefined means no cap.
 *
 * `expectedPageCount` may be a single number or an array (e.g. [2, 3] for a
 * form that comes in two known lengths) — we treat the largest value as the
 * upper bound.
 */
function expectedMaxPages(documentName: string): number | undefined {
  const item = findCatalogItemByName(documentName);
  if (!item || item.expectedPageCount === undefined) return undefined;
  if (Array.isArray(item.expectedPageCount)) {
    return Math.max(...item.expectedPageCount);
  }
  return item.expectedPageCount;
}

const ANCHOR_CONFIDENCE_THRESHOLD = 90;

function isAnchor(p: PageClassification): boolean {
  return (
    p.confidence >= ANCHOR_CONFIDENCE_THRESHOLD &&
    p.documentName !== UNSURE_DOCUMENT_NAME &&
    p.documentName !== "Unknown" &&
    p.documentName !== "Other"
  );
}

/**
 * How many pages this document may span.
 *
 * A "Page 2 of 3" stamp printed on the page wins over the catalog, because it
 * is per-instance: forms like the KYC Update ship in both a 2-page and a
 * 3-page variant, and the catalog's `expectedPageCount` can only describe one
 * entry at a time. Falls back to the catalog when the page carries no stamp.
 */
function effectiveMaxPages(page: PageClassification): number | undefined {
  return page.pageIndicator?.total ?? expectedMaxPages(page.documentName);
}

/** The page cap for an in-progress run: first stamp seen wins, else catalog. */
function runMaxPages(run: PageClassification[]): number | undefined {
  for (const p of run) {
    if (p.pageIndicator) return p.pageIndicator.total;
  }
  return run.length > 0 ? expectedMaxPages(run[0].documentName) : undefined;
}

/** Copy an anchor's identity onto a page that belongs to the same document. */
function adoptIdentity(
  page: PageClassification,
  anchor: PageClassification,
  direction: "continuation" | "preceding"
): PageClassification {
  return {
    ...page,
    documentType: anchor.documentType,
    documentName: anchor.documentName,
    documentCode: anchor.documentCode,
    category: anchor.category,
    confidence: Math.max(page.confidence, 88),
    reason: `${direction} page of ${anchor.documentName} (anchor at p${anchor.pageNumber})`,
    needsReview: false,
    source: "fallback",
  };
}

/**
 * Anchor-and-expand. For each anchor page (a page with a confident catalog
 * match), claim the surrounding Unsure pages as pages of the same form.
 *
 * This handles the case where only page 1 of a multi-page form prints the
 * form code in its header — pages 2..N have no code and would otherwise be
 * left as Unsure.
 *
 * Two things bound the expansion: the form's page count (from the page's own
 * "Page N of M" stamp when it has one, else the catalog), and any conflicting
 * stamp on a neighbouring page. Expansion also stops at another anchor so a
 * run can never swallow a different document.
 *
 * Expansion runs backward as well as forward: when the code prints on page 2
 * but not page 1, the anchor's own stamp ("Page 2 of 3") tells us a page of
 * this form precedes it. Without the backward pass that leading page stays
 * Unsure and — because the group takes its name from its first page — would
 * name the whole document "Unsure".
 */
function expandAnchors(
  classifications: PageClassification[]
): PageClassification[] {
  const result = classifications.map((p) => ({ ...p }));

  for (let i = 0; i < result.length; i++) {
    const anchor = result[i];
    if (!isAnchor(anchor)) continue;
    const expected = effectiveMaxPages(anchor);
    if (expected === undefined || expected <= 1) continue;

    // Where the anchor sits inside its own document. Without a stamp we can
    // only assume it is the first page, which is the common case (the form
    // code prints in the header of page 1).
    const anchorIndex = anchor.pageIndicator?.index ?? 1;

    // ---- forward ----
    let position = anchorIndex;
    for (let j = i + 1; j < result.length && position < expected; j++) {
      const next = result[j];
      // Must be the immediate next page (no gap).
      if (next.pageNumber !== result[j - 1].pageNumber + 1) break;
      // A stamp on the neighbour is ground truth: it either confirms the next
      // slot in this document or proves the document ended.
      if (
        next.pageIndicator &&
        !(
          next.pageIndicator.total === expected &&
          next.pageIndicator.index === position + 1
        )
      ) {
        break;
      }
      // Same anchor doc already → continues the run, don't override.
      if (
        next.documentName === anchor.documentName &&
        next.category === anchor.category
      ) {
        position += 1;
        continue;
      }
      // Hit another anchor (different document) → stop, don't overwrite.
      if (isAnchor(next)) break;
      // Otherwise the page is Unsure / weak / Unknown — claim it.
      result[j] = adoptIdentity(next, anchor, "continuation");
      position += 1;
    }

    // ---- backward ----
    // Only meaningful when the anchor's stamp says pages precede it.
    if (!anchor.pageIndicator || anchorIndex <= 1) continue;
    position = anchorIndex;
    for (let j = i - 1; j >= 0 && position > 1; j--) {
      const prev = result[j];
      if (prev.pageNumber !== result[j + 1].pageNumber - 1) break;
      if (
        prev.pageIndicator &&
        !(
          prev.pageIndicator.total === expected &&
          prev.pageIndicator.index === position - 1
        )
      ) {
        break;
      }
      if (
        prev.documentName === anchor.documentName &&
        prev.category === anchor.category
      ) {
        position -= 1;
        continue;
      }
      if (isAnchor(prev)) break;
      result[j] = adoptIdentity(prev, anchor, "preceding");
      position -= 1;
    }
  }

  return result;
}

function buildGroupFromPages(
  pages: PageClassification[],
  args: BuildGroupArgs
): DocumentGroup {
  const head = pages[0];
  const pageNumbers = pages.map((p) => p.pageNumber);
  const startPage = pageNumbers[0];
  const endPage = pageNumbers[pageNumbers.length - 1];
  const averageConfidence = Math.round(
    pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length
  );
  const anyPageNeedsReview = pages.some((p) => p.needsReview);
  const status = deriveStatus({
    documentName: head.documentName,
    averageConfidence,
    anyPageNeedsReview,
  });
  const reason = pages
    .map((p) => `p${p.pageNumber}: ${p.reason}`)
    .join(" | ");
  const matchedKeywords = Array.from(
    new Set(pages.flatMap((p) => p.matchedKeywords))
  );
  const extractedTextPreview = pages
    .map((p) => p.extractedTextPreview)
    .filter(Boolean)
    .slice(0, 3)
    .join("\n\n— next page —\n\n");

  const suggestedFileName = buildSuggestedFileName({
    clientName: args.clientName || "Client",
    clientId: args.clientId,
    advisorName: args.advisorName,
    documentName: head.documentName,
    documentCode: head.documentCode,
    category: head.category,
    startPage,
    endPage,
  });

  return {
    id: makeId(),
    documentType: head.documentType,
    documentName: head.documentName,
    documentCode: head.documentCode,
    category: head.category,
    startPage,
    endPage,
    pageNumbers,
    averageConfidence,
    status,
    needsReview: status !== "Ready",
    approved: false,
    reason,
    matchedKeywords,
    extractedTextPreview,
    source: bestSource(pages),
    suggestedFileName,
    finalFileName: suggestedFileName,
  };
}

/**
 * Group strictly consecutive pages that share BOTH documentName AND category.
 *
 * Cross-document re-merging is intentionally not performed — runs of the
 * same document interrupted by another document stay as separate groups so
 * the splitter can never accidentally absorb pages from a different form.
 *
 * "Page N of M" stamps override name/category agreement in both directions:
 *
 *  - A page stamped "Page 1 of M" always opens a new document, even when the
 *    run in progress carries the same document name. This is what separates
 *    two AIO order requests filed back to back — six pages that all classify
 *    identically, but which are three distinct two-page documents.
 *  - Two adjacent stamped pages that are NOT consecutive ("3 of 3" followed
 *    by "1 of 3") end the run even if both pages classify the same way.
 *  - Conversely, a stamp that continues the run holds an unnamed page inside
 *    the document it belongs to.
 *
 * Each group is also capped at its page count — the stamp's total when there
 * is one, otherwise the catalog's `expectedPageCount`. If a run exceeds the
 * cap (because weak keyword matches keep extending it), the overflow pages
 * are flushed as their own Unsure group so the employee can decide what they
 * actually are.
 */
export function groupPages(
  classifications: PageClassification[],
  args: BuildGroupArgs
): DocumentGroup[] {
  if (classifications.length === 0) return [];

  const sortedRaw = [...classifications].sort(
    (a, b) => a.pageNumber - b.pageNumber
  );
  const sorted = expandAnchors(sortedRaw);
  const groups: DocumentGroup[] = [];
  let current: PageClassification[] = [];

  const flushCurrent = () => {
    if (current.length === 0) return;
    groups.push(buildGroupFromPages(current, args));
    current = [];
  };

  // `previousName` is passed in because the caller flushes the in-progress run
  // before calling this — by then `current` is empty.
  const flushAsUnsure = (page: PageClassification, previousName: string) => {
    const reclassified: PageClassification = {
      ...page,
      documentType: "Other",
      documentName: UNSURE_DOCUMENT_NAME,
      documentCode: undefined,
      reason: `${page.reason} (overflow past expected page count for ${previousName})`,
      needsReview: true,
      source: "fallback",
    };
    groups.push(buildGroupFromPages([reclassified], args));
  };

  const startNewGroup = (page: PageClassification) => {
    flushCurrent();
    current.push(page);
  };

  for (const page of sorted) {
    if (current.length === 0) {
      current.push(page);
      continue;
    }
    const last = current[current.length - 1];
    const sameDoc =
      last.documentName === page.documentName && last.category === page.category;

    // A gap in page numbers always ends the run.
    if (page.pageNumber !== last.pageNumber + 1) {
      startNewGroup(page);
      continue;
    }

    // "Page 1 of M" — a fresh physical document starts here regardless of how
    // this page classified, so back-to-back copies of the same form split.
    if (page.pageIndicator?.index === 1) {
      startNewGroup(page);
      continue;
    }

    // Both pages stamped but not consecutive → different documents.
    const stampedContinuation = indicatorsAreConsecutive(
      last.pageIndicator,
      page.pageIndicator
    );
    if (last.pageIndicator && page.pageIndicator && !stampedContinuation) {
      startNewGroup(page);
      continue;
    }

    // A stamp can hold an unnamed page inside the current document, but it may
    // never absorb a page that confidently identifies as a different form.
    const joins =
      sameDoc || (stampedContinuation && !(isAnchor(page) && !sameDoc));
    if (!joins) {
      startNewGroup(page);
      continue;
    }

    const cap = runMaxPages(current);
    if (cap !== undefined && current.length >= cap) {
      // Already at the form's max — this page can't belong to the same
      // physical document, so the run ends here either way.
      const previousName = current[0].documentName;
      flushCurrent();
      if (isAnchor(page)) {
        // The page prints its own form code: it opens the next copy of the
        // document (three AIO orders filed in a row), not an anomaly.
        current.push(page);
      } else {
        // Genuinely unidentified overflow — surface it so the reviewer picks
        // a real type rather than letting it inflate the previous document.
        flushAsUnsure(page, previousName);
      }
      continue;
    }
    current.push(page);
  }
  flushCurrent();

  return groups;
}

/**
 * Detect duplicate non-consecutive document groups (same documentName).
 */
export function findDuplicateDocuments(
  groups: DocumentGroup[]
): Record<string, DocumentGroup[]> {
  const byName = new Map<string, DocumentGroup[]>();
  for (const g of groups) {
    if (
      g.documentName === "Other" ||
      g.documentName === "Unknown" ||
      g.documentName === UNSURE_DOCUMENT_NAME
    ) {
      continue;
    }
    if (g.category === "Signature Pages") continue;
    if (!byName.has(g.documentName)) byName.set(g.documentName, []);
    byName.get(g.documentName)!.push(g);
  }
  const result: Record<string, DocumentGroup[]> = {};
  for (const [name, list] of byName.entries()) {
    if (list.length > 1) result[name] = list;
  }
  return result;
}

export interface MissingCoreDocument {
  label: string;
}

/**
 * Returns the core onboarding documents that don't appear in the detected
 * groups (matched by either documentName or category).
 */
export function findMissingCoreDocuments(
  groups: DocumentGroup[]
): MissingCoreDocument[] {
  const missing: MissingCoreDocument[] = [];
  const presentNames = new Set(groups.map((g) => g.documentName));
  const presentCategories = new Set(groups.map((g) => g.category));

  for (const req of CORE_DOCUMENT_REQUIREMENTS) {
    const nameHit = req.matchDocumentNames?.some((n) => presentNames.has(n)) ?? false;
    const catHit = req.matchCategories?.some((c) => presentCategories.has(c)) ?? false;
    if (!nameHit && !catHit) missing.push({ label: req.label });
  }
  return missing;
}

export { NEEDS_REVIEW_THRESHOLD, safeFileSegment };
