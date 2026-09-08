/**
 * Reading a rendered Keybase page back into sections.
 *
 * Most of Keybase's financial education — the TFSA, RRSP, RESP, and investment
 * pages — lives as React components rather than as records in a content store,
 * so the only faithful copy of that prose is the page a visitor actually sees.
 * The indexer fetches those pages and extracts them here.
 *
 * Written against the string rather than through a DOM library on purpose: the
 * repository has no HTML parser, this needs to run in a plain Node script, and
 * the job is a strict subset of parsing — find <main>, drop the chrome, keep
 * the headings and the prose.
 */

import type { DocumentSection } from "@/lib/keybase-answer/chunking";

/** Elements whose entire contents are site furniture, not content. */
const STRIPPED_ELEMENTS = [
  "script",
  "style",
  "noscript",
  "svg",
  "template",
  "nav",
  "header",
  "footer",
  "form",
  "select",
  "button",
  "iframe",
];

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (whole, name: string) => {
      const value = HTML_ENTITIES[name.toLowerCase()];
      return value ?? whole;
    });
}

function stripElement(html: string, tag: string): string {
  const pattern = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  let previous: string;
  let current = html;
  // Repeat until stable: nested elements of the same name (a <nav> inside a
  // <nav>) leave a stray closing tag behind on a single pass.
  do {
    previous = current;
    current = current.replace(pattern, " ");
  } while (current !== previous);
  return current.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), " ");
}

/** The innermost <main>, or the whole body when a page has none. */
function isolateMain(html: string): string {
  const opens = [...html.matchAll(/<main\b[^>]*>/gi)];
  if (opens.length > 0) {
    const start = opens[0].index + opens[0][0].length;
    const close = html.toLowerCase().lastIndexOf("</main>");
    if (close > start) return html.slice(start, close);
  }
  const bodyOpen = /<body\b[^>]*>/i.exec(html);
  if (bodyOpen) {
    const start = bodyOpen.index + bodyOpen[0].length;
    const close = html.toLowerCase().lastIndexOf("</body>");
    return close > start ? html.slice(start, close) : html.slice(start);
  }
  return html;
}

function collapse(text: string): string {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

/** Repeated calls to action and legal furniture that add nothing to an answer. */
const CHROME_PHRASES = [
  /^skip to (?:main )?content$/i,
  /^speak with an advisor$/i,
  /^learn more$/i,
  /^read more$/i,
  /^find out more$/i,
  /^get started$/i,
  /^contact us$/i,
  /^back to top$/i,
  /^all rights reserved/i,
  /^copyright/i,
  /^©/,
  /^cookie/i,
  /^we use cookies/i,
  /^privacy policy$/i,
  /^terms of use$/i,
];

function isChrome(text: string): boolean {
  if (text.length < 3) return true;
  return CHROME_PHRASES.some((re) => re.test(text));
}

/**
 * Turn one rendered page into sections. Headings (h1–h3) open a section;
 * paragraphs, list items, table cells, and blockquotes fill it.
 */
export function extractSections(html: string): DocumentSection[] {
  let working = isolateMain(html);
  for (const tag of STRIPPED_ELEMENTS) working = stripElement(working, tag);

  const sections: DocumentSection[] = [];
  let current: DocumentSection = { paragraphs: [] };
  const seen = new Set<string>();

  const push = () => {
    if (current.paragraphs.length > 0 || current.heading) sections.push(current);
  };

  const blockPattern =
    /<(h1|h2|h3|h4|p|li|blockquote|dd|dt|figcaption|td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;

  for (const match of working.matchAll(blockPattern)) {
    const tag = match[1].toLowerCase();
    const text = collapse(match[2].replace(/<[^>]+>/g, " "));
    if (!text || isChrome(text)) continue;

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      push();
      current = { heading: text, paragraphs: [] };
      continue;
    }
    // Cards and nav lists repeat the same label many times on a page; one copy
    // is information, five are noise that skews retrieval toward the chrome.
    const key = `${current.heading ?? ""}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    current.paragraphs.push(text);
  }
  push();

  return sections.filter((s) => s.paragraphs.length > 0);
}

/** Everything a page's sections say, as one blob. Stored as the document body. */
export function sectionsToText(sections: DocumentSection[]): string {
  return sections
    .map((s) =>
      s.heading ? `${s.heading}\n\n${s.paragraphs.join("\n\n")}` : s.paragraphs.join("\n\n"),
    )
    .join("\n\n");
}
