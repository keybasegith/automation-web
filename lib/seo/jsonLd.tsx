import type { SchemaNode } from "./schema/types";

/**
 * Renders a JSON-LD document into the server-rendered HTML.
 *
 * A plain server component — no client bundle, no effect, no hydration step, so
 * crawlers that do not execute JavaScript still receive the structured data.
 *
 * `data` may be null: every builder in this directory returns null when it has
 * nothing it can honestly say, and rendering nothing is the correct outcome.
 */
export default function JsonLd({ data }: { data: SchemaNode | null | undefined }) {
  if (!data) return null;

  if (process.env.NODE_ENV !== "production") warnOnInvalid(data);

  return (
    <script
      type="application/ld+json"
      // React escapes text children as HTML, which would corrupt the JSON
      // (turning quotes into &quot;). Injecting the serialized string directly
      // is the standard approach; serialize() below neutralises the sequences
      // that could otherwise break out of the <script> element.
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}

/**
 * JSON, with the characters that are dangerous inside a <script> element
 * escaped. `<` is the one that matters — without it a string containing
 * "</script>" would end the element early. U+2028/U+2029 are legal in JSON but
 * not in JavaScript source, so they are escaped as a matter of habit.
 */
export function serialize(data: SchemaNode): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Development-only sanity check. Deliberately lightweight: it catches the
 * mistakes that actually happen — a missing context or type, or an empty value
 * that slipped past compact() — without pulling in a validation dependency.
 */
function warnOnInvalid(data: SchemaNode) {
  const problems: string[] = [];
  if (!data["@context"]) problems.push("missing @context");

  const nodes = Array.isArray(data["@graph"])
    ? (data["@graph"] as SchemaNode[])
    : [data];
  for (const node of nodes) {
    if (!node["@type"]) problems.push("a node is missing @type");
    for (const [key, value] of Object.entries(node)) {
      if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
        problems.push(`empty value for "${key}"`);
      }
    }
  }

  try {
    JSON.parse(serialize(data));
  } catch {
    problems.push("does not serialize to valid JSON");
  }

  if (problems.length) {
    console.warn(`[seo] JSON-LD problems: ${[...new Set(problems)].join(", ")}`);
  }
}
