/**
 * Public URL segments for articles.
 *
 * The rule that matters: a slug is generated from the title once, when the
 * article is created, and then it belongs to the URL rather than to the title.
 * Renaming a published article does NOT move its page — the link somebody
 * emailed a client last month has to keep working. Changing a live slug is an
 * explicit admin action, never a side effect of editing a headline.
 */

/** Lowercase, hyphenated, punctuation stripped, accents folded. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Spell out the symbols a financial headline actually uses, rather than
    // dropping them: "Back at 3%" would otherwise collide with "Back at 3".
    .replace(/%/g, " percent ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");
}

/** A slug for an article whose title is still empty. */
export function fallbackSlug(): string {
  return "untitled-article";
}

/**
 * Make `base` unique against slugs already taken, by suffixing -2, -3, …
 *
 * The caller supplies the taken set, because uniqueness spans both the database
 * and the static articles still living in lib/insights/content — a new article
 * must not shadow the one already published at its URL.
 */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || fallbackSlug();
  if (!taken.has(root)) return root;
  for (let n = 2; n < 500; n += 1) {
    const candidate = `${root}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  // Practically unreachable; better than looping forever or returning a dup.
  return `${root}-${Date.now()}`;
}

/** Reserved because /newsroom/<slug> would collide with a real route. */
const RESERVED = new Set(["new", "preview", "draft", "api", "index"]);

/**
 * Validate a slug an admin typed by hand. Returns a message, or null when it
 * is usable.
 */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Enter a URL slug.";
  if (slug !== slugify(slug)) {
    return "Use lowercase letters, numbers, and hyphens only.";
  }
  if (slug.length < 3) return "The slug is too short.";
  if (RESERVED.has(slug)) return `"${slug}" is reserved and cannot be used.`;
  return null;
}
