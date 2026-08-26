/**
 * Shared types and helpers for the JSON-LD builders.
 *
 * Every builder follows the same two rules:
 *   1. Inputs are explicit and typed — no `Record<string, any>` free-for-all.
 *   2. Anything unknown is omitted, never emitted as "", [], or null.
 */

/** A JSON-LD node. Loose by necessity — schema.org is open-ended. */
export type SchemaNode = Record<string, unknown>;

export const SCHEMA_CONTEXT = "https://schema.org";

/**
 * Drops keys whose value carries no information: undefined, null, empty string,
 * empty array, empty object. Recurses into plain objects and arrays so nested
 * nodes (a PostalAddress with no postal code, say) come out clean too.
 */
export function compact<T extends SchemaNode>(node: T): T {
  const out: SchemaNode = {};
  for (const [key, value] of Object.entries(node)) {
    const cleaned = clean(value);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out as T;
}

function clean(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (Array.isArray(value)) {
    const items = value.map(clean).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value === "object") {
    const obj = compact(value as SchemaNode);
    // A node holding nothing but its own @type says nothing worth emitting.
    const meaningful = Object.keys(obj).filter((k) => k !== "@type" && k !== "@context");
    return meaningful.length ? obj : undefined;
  }
  return value;
}

/** Wraps one or more nodes into a single document with the schema.org context. */
export function schemaDocument(nodes: SchemaNode[]): SchemaNode | null {
  const present = nodes.filter(Boolean);
  if (present.length === 0) return null;
  if (present.length === 1) return { "@context": SCHEMA_CONTEXT, ...present[0] };
  return { "@context": SCHEMA_CONTEXT, "@graph": present };
}

/**
 * A reference to an entity defined elsewhere. Uses a stable `@id` once the
 * production domain is configured, and falls back to naming the entity inline —
 * which is still correct JSON-LD, just not deduplicated across the graph.
 */
export function entityReference(
  type: string,
  name: string,
  id: string | undefined,
): SchemaNode {
  return id ? { "@id": id } : { "@type": type, name };
}
