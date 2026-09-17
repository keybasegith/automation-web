import type { ArticleBlock, ArticleSource } from "@/lib/insights/types";
import type {
  ArticlePayload,
  PayloadByline,
  PayloadImage,
} from "@/lib/content/types";
import { emptyPayload } from "@/lib/content/types";

/**
 * The validation gate for authored content.
 *
 * Everything an author submits passes through here before it can reach the
 * database, and nothing else writes a payload. Two jobs:
 *
 * 1. Shape. A payload read back out of the store is always complete, so the
 *    renderer never has to defend against a half-written article.
 *
 * 2. Constraint. This is where "Keybase owns the presentation" is actually
 *    enforced. Blocks are matched against a closed list of semantic types, and
 *    anything else in the request is dropped — there is no field an author
 *    could put a font, a colour, a width, or a fragment of HTML into, because
 *    no such field is ever read. Restricting the editor UI is not the control;
 *    this is.
 *
 * Returns `{ value }` or `{ error }` — the same discriminated shape the website
 * CMS normalizers use (lib/cms/normalize.ts), so the routes look alike.
 */

export type NormalizeResult<T> = { value: T } | { error: string };

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

/** Collapse runs of whitespace and trim. Applied to every single-line field. */
const line = (v: unknown, max: number): string =>
  asString(v).replace(/\s+/g, " ").trim().slice(0, max);

/** Keep newlines, drop trailing space. For prose. */
const prose = (v: unknown, max: number): string =>
  asString(v).replace(/[ \t]+$/gm, "").trim().slice(0, max);

// Generous ceilings — these exist to stop a runaway payload, not to edit anyone.
const LIMITS = {
  title: 200,
  deck: 400,
  excerpt: 600,
  category: 80,
  eyebrow: 80,
  alt: 300,
  heading: 200,
  paragraph: 5_000,
  listItem: 1_000,
  cell: 500,
  quote: 2_000,
  attribution: 200,
  calloutTitle: 120,
  sourceLabel: 200,
  sourceTitle: 300,
  url: 2_000,
  disclosure: 5_000,
  seoTitle: 200,
  seoDescription: 400,
  tag: 60,
  takeaway: 400,
  name: 120,
  role: 200,
};

const MAX_BLOCKS = 400;
const MAX_SOURCES = 60;
const MAX_TAGS = 12;
const MAX_TAKEAWAYS = 6;
const MAX_LIST_ITEMS = 60;
const MAX_TABLE_COLUMNS = 8;
const MAX_TABLE_ROWS = 60;

/**
 * A link an author may cite or link to.
 *
 * http(s) only, and absolute. That rules out `javascript:` and `data:` — the
 * two schemes that turn a citation into a script — without the allow-list of
 * hostnames a compliance officer would then have to maintain. Reviewing where a
 * link actually points is the reviewer's job; making it inert is this function's.
 */
function safeUrl(value: unknown): string | undefined {
  const raw = line(value, LIMITS.url);
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * A stored media reference: an object-storage key or a site-relative path.
 * Absolute URLs are refused so hero images cannot be hotlinked off a third
 * party the firm does not control.
 */
function mediaRef(value: unknown): string {
  const raw = line(value, 500);
  if (!raw) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return "";
  if (raw.includes("..")) return "";
  return raw;
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/**
 * One body block, or null if it is not one of the six types the Keybase
 * template renders.
 *
 * Note what is NOT read off the incoming object: no className, no style, no
 * width, no colour, no raw html. An author cannot smuggle presentation through
 * because nothing here would carry it.
 */
function normalizeBlock(raw: unknown): ArticleBlock | null {
  const b = asRecord(raw);
  switch (b.type) {
    case "heading": {
      const text = line(b.text, LIMITS.heading);
      if (!text) return null;
      // Only h2 and h3. The h1 is the article's own headline, and the table of
      // contents is built from these two levels.
      const level = b.level === 3 ? 3 : 2;
      return { type: "heading", level, text };
    }

    case "paragraph": {
      const text = prose(b.text, LIMITS.paragraph);
      if (!text) return null;
      return { type: "paragraph", text };
    }

    case "list": {
      const items = asArray(b.items)
        .slice(0, MAX_LIST_ITEMS)
        .map((i) => line(i, LIMITS.listItem))
        .filter(Boolean);
      if (items.length === 0) return null;
      return b.ordered ? { type: "list", ordered: true, items } : { type: "list", items };
    }

    case "table": {
      const columns = asArray(b.columns)
        .slice(0, MAX_TABLE_COLUMNS)
        .map((c) => line(c, LIMITS.cell));
      if (columns.length === 0) return null;
      const rows = asArray(b.rows)
        .slice(0, MAX_TABLE_ROWS)
        .map((r) =>
          // Pad or trim every row to the column count, so a ragged table can
          // never render a row shorter than its header.
          Array.from({ length: columns.length }, (_, i) =>
            line(asArray(r)[i], LIMITS.cell)
          )
        );
      if (rows.length === 0) return null;
      const caption = line(b.caption, LIMITS.cell);
      return caption
        ? { type: "table", caption, columns, rows }
        : { type: "table", columns, rows };
    }

    case "callout": {
      const text = prose(b.text, LIMITS.paragraph);
      if (!text) return null;
      const title = line(b.title, LIMITS.calloutTitle);
      return title ? { type: "callout", title, text } : { type: "callout", text };
    }

    case "quote": {
      const text = prose(b.text, LIMITS.quote);
      if (!text) return null;
      const attribution = line(b.attribution, LIMITS.attribution);
      return attribution
        ? { type: "quote", text, attribution }
        : { type: "quote", text };
    }

    default:
      return null;
  }
}

function normalizeBody(raw: unknown): ArticleBlock[] {
  return asArray(raw)
    .slice(0, MAX_BLOCKS)
    .map(normalizeBlock)
    .filter((b): b is ArticleBlock => b !== null);
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

/**
 * A citation keeps its text even when its link is dropped.
 *
 * A dated release with no permanent URL is still a real source, and the
 * existing ArticleSources component already renders one as plain text. Refusing
 * the whole citation because the link is unusable would quietly delete an
 * author's evidence.
 */
function normalizeSource(raw: unknown): ArticleSource | null {
  const s = asRecord(raw);
  const label = line(s.label, LIMITS.sourceLabel);
  const title = line(s.title, LIMITS.sourceTitle);
  if (!label && !title) return null;
  const url = safeUrl(s.url);
  return url
    ? { label, title, url }
    : { label, title };
}

// ---------------------------------------------------------------------------
// Hero image and byline
// ---------------------------------------------------------------------------

function normalizeHeroImage(raw: unknown): PayloadImage | null {
  const img = asRecord(raw);
  const key = mediaRef(img.key ?? img.src);
  if (!key) return null;
  const dimension = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n < 20_000 ? Math.round(n) : 0;
  };
  return {
    key,
    alt: line(img.alt, LIMITS.alt),
    width: dimension(img.width),
    height: dimension(img.height),
  };
}

function normalizeByline(raw: unknown): PayloadByline | null {
  const b = asRecord(raw);
  const name = line(b.name, LIMITS.name);
  if (!name) return null;
  const profilePath = line(b.profilePath, 300);
  return {
    name,
    role: line(b.role, LIMITS.role),
    organization: line(b.organization, LIMITS.role) || "Keybase Financial Group",
    // Internal paths only — a byline must never link off to a personal site.
    profilePath:
      profilePath.startsWith("/") && !profilePath.startsWith("//")
        ? profilePath
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// The payload
// ---------------------------------------------------------------------------

/**
 * Clean an incoming payload. Never fails on content — an empty draft is a valid
 * thing to autosave, and an author halfway through a sentence must not get an
 * error dialog. What makes a payload fit to SUBMIT is a separate question,
 * answered by `payloadReadyToSubmit` below.
 */
export function normalizePayload(raw: unknown): NormalizeResult<ArticlePayload> {
  const p = asRecord(raw);
  const base = emptyPayload();

  return {
    value: {
      ...base,
      title: line(p.title, LIMITS.title),
      deck: prose(p.deck, LIMITS.deck),
      excerpt: prose(p.excerpt, LIMITS.excerpt),
      category: line(p.category, LIMITS.category),
      eyebrow: line(p.eyebrow, LIMITS.eyebrow),
      heroImage: normalizeHeroImage(p.heroImage),
      body: normalizeBody(p.body),
      sources: asArray(p.sources)
        .slice(0, MAX_SOURCES)
        .map(normalizeSource)
        .filter((s): s is ArticleSource => s !== null),
      keyTakeaways: asArray(p.keyTakeaways)
        .slice(0, MAX_TAKEAWAYS)
        .map((t) => line(t, LIMITS.takeaway))
        .filter(Boolean),
      tags: Array.from(
        new Set(
          asArray(p.tags)
            .map((t) => line(t, LIMITS.tag).toLowerCase())
            .filter(Boolean)
        )
      ).slice(0, MAX_TAGS),
      additionalDisclosure: prose(p.additionalDisclosure, LIMITS.disclosure),
      seoTitle: line(p.seoTitle, LIMITS.seoTitle),
      seoDescription: prose(p.seoDescription, LIMITS.seoDescription),
      authorByline: normalizeByline(p.authorByline),
    },
  };
}

/**
 * What an article needs before compliance should be asked to look at it.
 *
 * Everything here is a completeness check the author can act on, never a
 * judgement about the content itself. Returns the list of problems; an empty
 * list means it can be submitted.
 */
export function payloadReadyToSubmit(payload: ArticlePayload): string[] {
  const problems: string[] = [];

  if (!payload.title) problems.push("Add a title.");
  if (!payload.excerpt) {
    problems.push("Add a short excerpt — it is what the newsroom card shows.");
  }
  if (payload.body.length === 0) problems.push("The article has no content yet.");

  const words = payload.body.reduce((n, block) => n + blockWordCount(block), 0);
  if (words > 0 && words < 100) {
    problems.push("The article is very short. Add more content before submitting.");
  }

  // An image with no alt text is inaccessible, and the CMS spec makes alt text
  // a publishing requirement. Caught here rather than at publish, so the author
  // fixes it before a reviewer spends time on the piece.
  if (payload.heroImage && !payload.heroImage.alt) {
    problems.push("Add alt text describing the hero image.");
  }

  const incompleteSource = payload.sources.findIndex((s) => !s.label || !s.title);
  if (incompleteSource >= 0) {
    problems.push(
      `Source ${incompleteSource + 1} needs both an organization and a title.`
    );
  }

  return problems;
}

function blockWordCount(block: ArticleBlock): number {
  const count = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  switch (block.type) {
    case "heading":
      return count(block.text);
    case "paragraph":
    case "callout":
    case "quote":
      return count(block.text);
    case "list":
      return block.items.reduce((n, i) => n + count(i), 0);
    case "table":
      return block.rows.reduce(
        (n, row) => n + row.reduce((m, cell) => m + count(cell), 0),
        0
      );
  }
}

/** Words per minute for the reading-time estimate. Deliberately unhurried. */
const READING_WPM = 225;

/** Whole minutes, minimum one. Shown in the editor sidebar. */
export function readingTimeMinutes(payload: ArticlePayload): number {
  const words = payload.body.reduce((n, b) => n + blockWordCount(b), 0);
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / READING_WPM));
}
