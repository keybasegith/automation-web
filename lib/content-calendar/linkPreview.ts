import { lookup } from "dns/promises";
import { isIP } from "net";

/**
 * Open Graph preview for a pasted link.
 *
 * Fetching a URL a user typed means this server will connect wherever it is
 * pointed, so the request is fenced in three ways: scheme (http/https only),
 * destination (the hostname is resolved first and private / loopback /
 * link-local addresses are refused, which is what stops a paste of
 * `http://169.254.169.254/…` from reading cloud metadata), and size (the body
 * is read up to a cap and no further, and the whole fetch is time-boxed).
 *
 * A failure here is never fatal. If a site blocks us, redirects oddly, or is
 * simply slow, the link is still saved — with the URL as its title, which is
 * exactly what the user pasted.
 */

const FETCH_TIMEOUT_MS = 6000;
const MAX_BODY_BYTES = 512 * 1024;

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  imageUrl: string | null;
  siteName: string;
}

export class InvalidLinkError extends Error {}

/** Parse and normalize, or throw InvalidLinkError. Does not hit the network. */
export function normalizeLinkUrl(raw: unknown): URL {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new InvalidLinkError("Paste a link first.");
  }
  const candidate = raw.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new InvalidLinkError("That does not look like a valid link.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidLinkError("Only http and https links can be saved.");
  }
  if (url.href.length > 2000) {
    throw new InvalidLinkError("That link is too long.");
  }
  return url;
}

/** Addresses this server must not be talked into fetching. Exported for tests. */
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    return false;
  }
  if (version === 6) {
    const v6 = address.toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    if (v6.startsWith("fc") || v6.startsWith("fd")) return true; // unique local
    if (v6.startsWith("fe80")) return true; // link-local
    // IPv4-mapped (::ffff:10.0.0.1) — check the embedded address.
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    return false;
  }
  return true;
}

async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new InvalidLinkError("That link points at this network.");
  }
  if (isIP(host)) {
    if (isBlockedAddress(host)) {
      throw new InvalidLinkError("That link points at a private address.");
    }
    return;
  }
  let resolved: { address: string }[];
  try {
    resolved = await lookup(host, { all: true });
  } catch {
    throw new InvalidLinkError("That domain could not be resolved.");
  }
  if (resolved.length === 0 || resolved.some((r) => isBlockedAddress(r.address))) {
    throw new InvalidLinkError("That link points at a private address.");
  }
}

const decodeEntities = (value: string): string =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const clean = (value: string | null | undefined, max: number): string =>
  value ? decodeEntities(value).replace(/\s+/g, " ").trim().slice(0, max) : "";

/** Pull one meta tag's content, whichever attribute order the page used. */
function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Read at most MAX_BODY_BYTES of the response — a preview needs only the head. */
async function readCapped(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const chunks: string[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      chunks.push(decoder.decode(value, { stream: true }));
      if (total >= MAX_BODY_BYTES) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return chunks.join("");
}

/** The preview we fall back to: the link itself, described by its own URL. */
function barePreview(url: URL): LinkPreview {
  const path = `${url.pathname}${url.search}`.replace(/\/$/, "");
  return {
    url: url.href,
    title: path && path !== "" ? `${url.hostname}${path}`.slice(0, 200) : url.hostname,
    description: "",
    imageUrl: null,
    siteName: url.hostname.replace(/^www\./, ""),
  };
}

/**
 * Fetch a link's Open Graph card. Throws InvalidLinkError only for a URL that
 * must not be saved at all; every other failure degrades to `barePreview`.
 */
export async function fetchLinkPreview(url: URL): Promise<LinkPreview> {
  await assertPublicHost(url);

  let html: string;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        // Some sites serve a different (or no) page to an unknown agent.
        "user-agent":
          "Mozilla/5.0 (compatible; KeybaseContentCalendar/1.0; +link-preview)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) return barePreview(url);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return barePreview(url);
    html = await readCapped(response);
  } catch {
    return barePreview(url);
  }

  const fallback = barePreview(url);
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;

  const image = clean(
    metaContent(html, "og:image") ?? metaContent(html, "twitter:image"),
    600
  );
  let imageUrl: string | null = null;
  if (image) {
    try {
      const absolute = new URL(image, url);
      // Only a fetchable, public image reference is worth storing.
      if (absolute.protocol === "http:" || absolute.protocol === "https:") {
        imageUrl = absolute.href;
      }
    } catch {
      imageUrl = null;
    }
  }

  return {
    url: url.href,
    title:
      clean(metaContent(html, "og:title") ?? titleTag, 200) || fallback.title,
    description: clean(
      metaContent(html, "og:description") ?? metaContent(html, "description"),
      400
    ),
    imageUrl,
    siteName: clean(metaContent(html, "og:site_name"), 100) || fallback.siteName,
  };
}
