import { Fragment } from "react";
import Link from "next/link";

/**
 * The inline markup article copy is allowed: `**bold**` and `[text](url)`.
 *
 * Article bodies are structured blocks, not markdown, so there is no parser to
 * lean on — and pulling a markdown pipeline into the render path to support two
 * marks would be a poor trade. But financial copy leans hard on emphasising the
 * figure in a sentence and on linking the release it came from, and printing
 * the raw delimiters would be worse than not supporting them at all.
 *
 * Unpaired or malformed markup is left as literal text rather than swallowing
 * the rest of the sentence.
 *
 * LINK SAFETY
 *
 * A URL that is not http(s) and not a site-relative path renders as plain text.
 * That rules out `javascript:` and `data:` at the point of rendering, which is
 * where it has to hold: article bodies reach this component from the CMS AND
 * from the static store, and only one of those passes through a normalizer.
 */

/** External http(s), or an internal path. Anything else is not a link. */
function linkHref(raw: string): { href: string; external: boolean } | null {
  const url = raw.trim();
  if (!url) return null;

  // Internal, but not protocol-relative ("//evil.example" is not a path).
  if (url.startsWith("/") && !url.startsWith("//")) {
    return { href: url, external: false };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return { href: parsed.toString(), external: true };
  } catch {
    return null;
  }
}

/** `[text](url)`, where text has no brackets and url has no parentheses. */
const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Bold runs within one already-link-free string. */
function withBold(text: string, keyPrefix: string): React.ReactNode {
  const parts = text.split("**");
  // An odd number of delimiters means one is unpaired — render verbatim.
  if (parts.length % 2 === 0) return text;

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}b${i}`} className="font-semibold text-[#0a1f33]">
        {part}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}t${i}`}>{part}</Fragment>
    ),
  );
}

export default function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  // Links first, then bold inside the text between them — so a bold run and a
  // link can sit in the same sentence without either eating the other.
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    const [whole, label, url] = match;
    const target = linkHref(url);

    if (start > cursor) {
      nodes.push(
        <Fragment key={`p${index}`}>
          {withBold(text.slice(cursor, start), `p${index}`)}
        </Fragment>,
      );
    }

    if (!target) {
      // Not a usable link. The words still belong in the sentence.
      nodes.push(
        <Fragment key={`x${index}`}>{withBold(whole, `x${index}`)}</Fragment>,
      );
    } else if (target.external) {
      nodes.push(
        <a
          key={`l${index}`}
          href={target.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#006d6e] underline decoration-[#006d6e]/30 underline-offset-4 transition-colors hover:decoration-[#006d6e]"
        >
          {withBold(label, `l${index}`)}
        </a>,
      );
    } else {
      nodes.push(
        <Link
          key={`l${index}`}
          href={target.href}
          className="text-[#006d6e] underline decoration-[#006d6e]/30 underline-offset-4 transition-colors hover:decoration-[#006d6e]"
        >
          {withBold(label, `l${index}`)}
        </Link>,
      );
    }

    cursor = start + whole.length;
    index += 1;
  }

  if (cursor === 0) return <>{withBold(text, "s")}</>;

  if (cursor < text.length) {
    nodes.push(
      <Fragment key={`p${index}`}>
        {withBold(text.slice(cursor), `p${index}`)}
      </Fragment>,
    );
  }

  return <>{nodes}</>;
}
