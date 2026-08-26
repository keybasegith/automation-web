import { getPeopleByType, isProfileReady, profilePath } from "./people";
import type { PersonProfile } from "./types";

/**
 * The advisor directory's data layer: selection, search, and filtering.
 *
 * Pure functions over the shared people registry — there is no advisor store.
 * An advisor is a `PersonProfile` whose `profileTypes` include "advisor", which
 * is what lets one person be an advisor and a leader without being two records.
 */

/** Everyone the site publishes as an advisor, in registry order. */
export function getAdvisors(): PersonProfile[] {
  return getPeopleByType("advisor");
}

/** Advisors whose data supports a profile page of their own. */
export function getAdvisorsWithProfiles(): PersonProfile[] {
  return getAdvisors().filter(isProfileReady);
}

/** The profile URL for an advisor who has one. */
export function advisorProfilePath(person: PersonProfile): string | undefined {
  return isProfileReady(person) ? profilePath(person.id) : undefined;
}

export interface AdvisorFilters {
  /** Free text, matched against the name first. */
  query?: string;
  language?: string;
  province?: string;
  /** One entry from `areasOfExpertise`. */
  expertise?: string;
}

function matchesQuery(person: PersonProfile, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  // Name first, because that is what someone types into an advisor directory.
  // The rest is a fallback so a search for "Richmond Hill" or "Estate" still
  // lands somewhere useful.
  const haystack = [
    person.name,
    person.role,
    person.advisor?.city,
    person.advisor?.province,
    person.advisor?.office,
    ...(person.areasOfExpertise ?? []),
    ...(person.languages ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

/** Applies every supplied filter. An absent filter constrains nothing. */
export function filterAdvisors(
  advisors: PersonProfile[],
  filters: AdvisorFilters = {},
): PersonProfile[] {
  return advisors.filter((person) => {
    if (filters.query && !matchesQuery(person, filters.query)) return false;
    if (filters.language && !person.languages?.includes(filters.language)) return false;
    if (filters.province && person.advisor?.province !== filters.province) return false;
    if (filters.expertise && !person.areasOfExpertise?.includes(filters.expertise)) {
      return false;
    }
    return true;
  });
}

export type FacetKey = "language" | "province" | "expertise";

export interface Facet {
  key: FacetKey;
  /** The control's visible label. */
  label: string;
  options: { value: string; count: number }[];
}

/**
 * A filter has to earn its place.
 *
 * Two conditions, both of which exist to keep the directory from shipping
 * controls that cannot do anything:
 *
 *   1. At least two advisors carry the field. A filter that only ever isolates
 *      one person is a link to that person, not a filter.
 *   2. At least two distinct values. Every advisor working out of the same
 *      office makes a province filter a control with one option that changes
 *      nothing when you use it.
 *
 * Today no facet clears either bar — no advisor has language data, and all of
 * them work out of the same office — so the directory renders no filters at
 * all. Add the data and the controls appear on their own.
 */
export const MIN_ADVISORS_PER_FACET = 2;
export const MIN_VALUES_PER_FACET = 2;

function valuesFor(person: PersonProfile, key: FacetKey): string[] {
  if (key === "language") return person.languages ?? [];
  if (key === "expertise") return person.areasOfExpertise ?? [];
  return person.advisor?.province ? [person.advisor.province] : [];
}

const FACET_LABELS: Record<FacetKey, string> = {
  language: "Language",
  province: "Province",
  expertise: "Area of focus",
};

export function advisorFacets(advisors: PersonProfile[]): Facet[] {
  const facets: Facet[] = [];

  for (const key of ["expertise", "language", "province"] as FacetKey[]) {
    const counts = new Map<string, number>();
    let peopleWithData = 0;

    for (const person of advisors) {
      const values = valuesFor(person, key);
      if (values.length === 0) continue;
      peopleWithData += 1;
      for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    if (peopleWithData < MIN_ADVISORS_PER_FACET) continue;
    if (counts.size < MIN_VALUES_PER_FACET) continue;

    facets.push({
      key,
      label: FACET_LABELS[key],
      options: [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => a.value.localeCompare(b.value)),
    });
  }

  return facets;
}

/**
 * Below this, every advisor is on screen at once and a search box is furniture.
 * The directory renders its controls only once the roster outgrows the page.
 */
export const MIN_ADVISORS_FOR_SEARCH = 12;

/**
 * Whether the directory should render interactive controls at all.
 *
 * Kept as one decision so the page can answer it before choosing between the
 * plain server-rendered grid and the filterable one — the cards are identical
 * either way, and are in the HTML either way.
 */
export function directoryControls(advisors: PersonProfile[]): {
  search: boolean;
  facets: Facet[];
  enabled: boolean;
} {
  const facets = advisorFacets(advisors);
  const search = advisors.length >= MIN_ADVISORS_FOR_SEARCH;
  return { search, facets, enabled: search || facets.length > 0 };
}

/**
 * Service pages an advisor's stated areas of focus genuinely map to.
 *
 * A hand-written table, not a match on words: an advisor is linked to a service
 * page only where the connection is unambiguous, and an area with no entry here
 * produces no link rather than a guess. Nobody is linked to every service.
 *
 * "Investment Strategy" resolves to Traditional Investments because that is the
 * page the site's own navigation points "Investment Advisory" at.
 */
const SERVICE_BY_EXPERTISE: Record<string, { href: string; label: string }[]> = {
  "Wealth Management": [{ href: "/wealth-building", label: "Wealth Building" }],
  "Retirement & Estate Planning": [
    { href: "/retirement-planning", label: "Retirement Planning" },
    { href: "/estate-planning", label: "Estate Planning" },
  ],
  "Retirement Planning": [
    { href: "/retirement-planning", label: "Retirement Planning" },
  ],
  "Estate Planning": [{ href: "/estate-planning", label: "Estate Planning" }],
  "Tax Planning": [{ href: "/tax-planning", label: "Tax Planning" }],
  "Education Planning": [
    { href: "/education-planning", label: "Education Planning" },
  ],
  "Investment Strategy": [
    { href: "/traditional-investments", label: "Traditional Investments" },
  ],
  "Insurance Planning": [{ href: "/insurance", label: "Insurance" }],
};

export function relatedServicesFor(
  person: PersonProfile,
): { href: string; label: string }[] {
  const seen = new Set<string>();
  const services: { href: string; label: string }[] = [];

  for (const area of person.areasOfExpertise ?? []) {
    for (const service of SERVICE_BY_EXPERTISE[area] ?? []) {
      if (seen.has(service.href)) continue;
      seen.add(service.href);
      services.push(service);
    }
  }

  return services;
}

/**
 * Where a directory card's "Request a meeting" goes.
 *
 * The site's existing contact form, with the advisor named in the query string
 * so the form can say who the enquiry is for. No booking system is invented and
 * no calendar service is added.
 */
export function advisorContactPath(person: PersonProfile): string {
  return `/contact?advisor=${encodeURIComponent(person.id)}`;
}
