/** Public service identities; no component imports in routing/security code. */
export const SERVICE_SLUGS = [
  "education-planning",
  "estate-planning",
  "retirement-planning",
  "tax-planning",
  "wealth-building",
  "non-registered-investments",
  "rdsp",
  "resp",
  "rrsp",
  "tfsa",
  "fhsa",
  "traditional-investments",
  "alternative-investments",
  "insurance",
  "travel-insurance",
  "segregated-funds"
] as const;

/** Verified legacy paths. Unmapped documents stay out until inventoried. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/our-company": "/about",
  "/vision": "/about",
  "/contact-us": "/contact",
  "/registered-retirement-savings-plan-rrsp": "/rrsp",
  "/registered-education-savings-plan-resp": "/resp",
  "/tax-free-savings-account-tfsa": "/tfsa",
  "/first-home-savings-account-fhsa": "/fhsa",
  "/our-services/registered-disability-savings-plan-rdsp": "/rdsp",
  "/client-value/independently-different": "/about",
  "/client-value/working-with-a-keybase-advisor": "/our-advisors",
  "/working-with-a-keybase-advisor": "/our-advisors",
  "/join-elite-group": "/become-an-advisor",
  "/join-elite-group-form-careers-office-staff": "/careers"
};

export function canonicalPublicPath(path: string): string {
  const trimmed = path.replace(/\/+$/, "") || "/";
  if (trimmed === "/services") return "/wealth-building";
  const slug = trimmed.replace(/^\/services\//, "");
  if (trimmed.startsWith("/services/") && SERVICE_SLUGS.some((s) => s === slug)) return `/${slug}`;
  return LEGACY_REDIRECTS[trimmed] ?? trimmed;
}

/** Normalize only local links, preserving queries and fragments. */
export function canonicalPublicHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const match = href.match(/^([^?#]*)(.*)$/);
  return match ? canonicalPublicPath(match[1]) + match[2] : href;
}
