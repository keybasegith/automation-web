/**
 * Isomorphic unique id generator, safe in both the browser and Node. Used for
 * temporary client-side ids on new list items; the server assigns/keeps the
 * authoritative id when the draft is saved.
 */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
