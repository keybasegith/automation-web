/**
 * Development-only semantic/heading audit.
 *
 * Reads the prerendered HTML that `next build` leaves in `.next/server/app`
 * and reports, per route: the heading outline, skipped heading levels, missing
 * or duplicated <h1>, and the landmark elements present. Nothing here ships to
 * production — it is a build-output linter, run by hand:
 *
 *   npm run build && node scripts/audit-semantics.mjs
 *   node scripts/audit-semantics.mjs --public   (marketing routes only)
 *   node scripts/audit-semantics.mjs --outline  (print every heading)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const DIR = ".next/server/app";

/** The public marketing site. Everything else is an internal tool or utility page. */
const PUBLIC_ROUTES = new Set([
  "index", "about", "key-executives", "ceo-message", "our-advisors",
  "become-an-advisor", "careers", "contact", "newsroom",
  "wealth-building", "traditional-investments", "alternative-investments",
  "non-registered-investments", "insurance", "segregated-funds",
  "travel-insurance", "tax-planning", "retirement-planning", "estate-planning",
  "education-planning", "rrsp", "tfsa", "fhsa", "resp", "rdsp",
  "compound-interest", "compound-calculator", "profile-jleung", "wealth-offering",
]);

const stripTags = (s) =>
  s.replace(/<[^>]*>/g, " ").replace(/<!--.*?-->/g, "").replace(/&amp;/g, "&")
   .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
   .replace(/\s+/g, " ").trim();

function analyze(html) {
  const headings = [];
  const re = /<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[2];
    headings.push({
      level: Number(m[1][1]),
      text: stripTags(m[3]),
      hidden: /\bsr-only\b|aria-hidden="true"/.test(attrs),
    });
  }
  const landmarks = {};
  for (const tag of ["header", "nav", "main", "footer", "article", "aside", "section"]) {
    landmarks[tag] = (html.match(new RegExp(`<${tag}[\\s>]`, "gi")) || []).length;
  }
  const navLabels = [...html.matchAll(/<nav\b([^>]*)>/gi)].map(
    (n) => (n[1].match(/aria-label="([^"]*)"/) || [, "(none)"])[1],
  );
  return { headings, landmarks, navLabels };
}

/** Every prerendered page, including nested routes like /services/<slug>. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".html") ? [join(dir, e.name)] : [],
  );
}

const args = new Set(process.argv.slice(2));
const files = walk(DIR)
  .map((f) => relative(DIR, f))
  .filter((f) => !f.split("/").some((seg) => seg.startsWith("_")));

let problems = 0;
for (const file of files.sort()) {
  const route = file.replace(/\.html$/, "");
  // /services is a redirect() stub — it renders no body, so there is nothing to audit.
  if (route === "services") continue;
  if (args.has("--public") && !PUBLIC_ROUTES.has(route) && !route.startsWith("services/")) continue;

  const { headings, landmarks, navLabels } = analyze(readFileSync(join(DIR, file), "utf8"));
  const h1s = headings.filter((h) => h.level === 1);
  const issues = [];

  if (h1s.length === 0) issues.push("NO H1");
  if (h1s.length > 1) issues.push(`${h1s.length} H1s: ${h1s.map((h) => JSON.stringify(h.text)).join(", ")}`);
  if (landmarks.main === 0) issues.push("no <main>");
  if (landmarks.main > 1) issues.push(`${landmarks.main} <main> elements`);
  if (navLabels.length > 1 && navLabels.some((l) => l === "(none)"))
    issues.push(`${navLabels.length} <nav> regions, unlabelled: ${navLabels.join(" | ")}`);

  let prev = 0;
  for (const h of headings) {
    if (prev && h.level > prev + 1) issues.push(`skipped h${prev} -> h${h.level} at ${JSON.stringify(h.text)}`);
    if (!h.text) issues.push(`empty h${h.level}`);
    prev = h.level;
  }

  const label = `/${route === "index" ? "" : route}`;
  if (issues.length) {
    problems++;
    console.log(`\n\x1b[31m✗ ${label}\x1b[0m`);
    for (const i of issues) console.log(`    ${i}`);
  } else {
    console.log(`\x1b[32m✓ ${label}\x1b[0m  (${headings.length} headings, ${landmarks.section} sections)`);
  }
  if (args.has("--outline")) {
    for (const h of headings) console.log(`      ${"  ".repeat(h.level - 1)}h${h.level}: ${h.text.slice(0, 78)}`);
  }
}
console.log(`\n${problems} of ${files.length} routes with issues.`);
