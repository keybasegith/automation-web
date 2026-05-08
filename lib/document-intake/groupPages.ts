import {
  CORE_DOCUMENT_REQUIREMENTS,
  findCatalogItemByName,
} from "./documentCatalog";
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
 * Anchor-and-expand. For each anchor page (a page with a confident catalog
 * match), claim immediately following Unsure pages as continuation pages of
 * the same form, up to the anchor's `expectedPageCount`.
 *
 * This handles the case where only page 1 of a multi-page form prints the
 * form code in its header — pages 2..N have no code and would otherwise be
 * left as Unsure.
 *
 * Stops expanding if it hits another anchor (different doc) or runs past
 * the form's expected page count. Pages that already match the anchor's
 * document do not consume a slot but continue the run.
 */
function expandAnchorsForward(
  classifications: PageClassification[]
): PageClassification[] {
  const result = classifications.map((p) => ({ ...p }));
  for (let i = 0; i < result.length; i++) {
    const anchor = result[i];
    if (!isAnchor(anchor)) continue;
    const expected = expectedMaxPages(anchor.documentName);
    if (expected === undefined || expected <= 1) continue;

    let claimed = 1;
    for (let j = i + 1; j < result.length && claimed < expected; j++) {
      const next = result[j];
      // Must be the immediate next page (no gap).
      if (next.pageNumber !== result[j - 1].pageNumber + 1) break;

      // Same anchor doc already → continues the run, don't override.
      if (
        next.documentName === anchor.documentName &&
        next.category === anchor.category
      ) {
        claimed += 1;
        continue;
      }
      // Hit another anchor (different document) → stop, don't overwrite.
      if (isAnchor(next)) break;
      // Otherwise the page is Unsure / weak / Unknown — claim it as a
      // continuation of the anchor's form.
      result[j] = {
        ...next,
        documentType: anchor.documentType,
        documentName: anchor.documentName,
        documentCode: anchor.documentCode,
        category: anchor.category,
        confidence: Math.max(next.confidence, 88),
        reason: `continuation page of ${anchor.documentName} (anchor at p${anchor.pageNumber})`,
        needsReview: false,
        source: "fallback",
      };
      claimed += 1;
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
 * Each group is also capped at the catalog's `expectedPageCount`. If a run
 * exceeds the cap (because weak keyword matches keep extending it), the
 * overflow pages are flushed as their own Unsure group so the employee can
 * decide what they actually are.
 */
export function groupPages(
  classifications: PageClassification[],
  args: BuildGroupArgs
): DocumentGroup[] {
  if (classifications.length === 0) return [];

  const sortedRaw = [...classifications].sort(
    (a, b) => a.pageNumber - b.pageNumber
  );
  const sorted = expandAnchorsForward(sortedRaw);
  const groups: DocumentGroup[] = [];
  let current: PageClassification[] = [];

  const flushCurrent = () => {
    if (current.length === 0) return;
    groups.push(buildGroupFromPages(current, args));
    current = [];
  };

  const flushAsUnsure = (page: PageClassification) => {
    const reclassified: PageClassification = {
      ...page,
      documentType: "Other",
      documentName: UNSURE_DOCUMENT_NAME,
      documentCode: undefined,
      reason: `${page.reason} (overflow past expected page count for ${current[0]?.documentName ?? "previous group"})`,
      needsReview: true,
      source: "fallback",
    };
    groups.push(buildGroupFromPages([reclassified], args));
  };

  for (const page of sorted) {
    if (current.length === 0) {
      current.push(page);
      continue;
    }
    const last = current[current.length - 1];
    const sameDoc =
      last.documentName === page.documentName && last.category === page.category;
    const consecutive = page.pageNumber === last.pageNumber + 1;
    if (sameDoc && consecutive) {
      const cap = expectedMaxPages(last.documentName);
      if (cap !== undefined && current.length >= cap) {
        // Already at the form's max — extra page can't belong to the same
        // physical document. Flush the in-progress group and treat this page
        // as Unsure so the reviewer picks a real type for it.
        flushCurrent();
        flushAsUnsure(page);
        continue;
      }
      current.push(page);
    } else {
      flushCurrent();
      current.push(page);
    }
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
