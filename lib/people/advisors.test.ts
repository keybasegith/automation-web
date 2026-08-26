import { describe, expect, it } from "vitest";

import {
  MIN_ADVISORS_FOR_SEARCH,
  advisorContactPath,
  advisorFacets,
  advisorProfilePath,
  directoryControls,
  filterAdvisors,
  getAdvisors,
  getAdvisorsWithProfiles,
  relatedServicesFor,
} from "./advisors";
import { PEOPLE, getPerson } from "./people";
import type { PersonProfile } from "./types";

function advisor(overrides: Partial<PersonProfile> = {}): PersonProfile {
  return {
    id: "test-advisor",
    name: "Test Advisor",
    role: "Financial Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["advisor"],
    ...overrides,
  };
}

describe("the advisor roster", () => {
  const advisors = getAdvisors();

  it("draws from the shared registry rather than a second store", () => {
    for (const person of advisors) {
      expect(getPerson(person.id)).toBe(person);
      expect(PEOPLE).toContain(person);
    }
  });

  it("gives every advisor a unique slug", () => {
    const ids = advisors.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("records the office each advisor's own card prints", () => {
    for (const person of advisors) {
      expect(person.advisor?.city).toBe("Richmond Hill");
      expect(person.advisor?.province).toBe("ON");
    }
  });

  it("publishes no advisor profile pages, because none has a biography", () => {
    expect(getAdvisorsWithProfiles()).toEqual([]);
    for (const person of advisors) {
      expect(advisorProfilePath(person)).toBeUndefined();
    }
  });

  it("points every advisor's contact action at the existing contact form", () => {
    expect(advisorContactPath(advisor({ id: "jane-doe" }))).toBe(
      "/contact?advisor=jane-doe",
    );
  });
});

describe("filtering", () => {
  const store = [
    advisor({
      id: "a-one",
      name: "Ana Ruiz",
      languages: ["English", "Spanish"],
      areasOfExpertise: ["Estate Planning"],
      advisor: { city: "Richmond Hill", province: "ON" },
    }),
    advisor({
      id: "b-two",
      name: "Ben Tran",
      languages: ["English"],
      areasOfExpertise: ["Retirement Planning"],
      advisor: { city: "Calgary", province: "AB" },
    }),
    advisor({ id: "c-three", name: "Cara Bell" }),
  ];

  it("returns everyone when nothing is filtered", () => {
    expect(filterAdvisors(store)).toHaveLength(3);
    expect(filterAdvisors(store, {})).toHaveLength(3);
    expect(filterAdvisors(store, { query: "  " })).toHaveLength(3);
  });

  it("matches a name regardless of case", () => {
    expect(filterAdvisors(store, { query: "ben" }).map((a) => a.id)).toEqual(["b-two"]);
    expect(filterAdvisors(store, { query: "TRAN" }).map((a) => a.id)).toEqual(["b-two"]);
  });

  it("also matches a city or an area of focus typed into the box", () => {
    expect(filterAdvisors(store, { query: "calgary" }).map((a) => a.id)).toEqual([
      "b-two",
    ]);
    expect(filterAdvisors(store, { query: "estate" }).map((a) => a.id)).toEqual([
      "a-one",
    ]);
  });

  it("filters by language", () => {
    expect(filterAdvisors(store, { language: "Spanish" }).map((a) => a.id)).toEqual([
      "a-one",
    ]);
    expect(filterAdvisors(store, { language: "English" })).toHaveLength(2);
  });

  it("filters by province", () => {
    expect(filterAdvisors(store, { province: "AB" }).map((a) => a.id)).toEqual([
      "b-two",
    ]);
  });

  it("filters by area of focus", () => {
    expect(
      filterAdvisors(store, { expertise: "Retirement Planning" }).map((a) => a.id),
    ).toEqual(["b-two"]);
  });

  it("excludes advisors with no data for the filtered field", () => {
    // Cara has no languages and no province: she is absent from both, rather
    // than being treated as matching everything.
    expect(filterAdvisors(store, { language: "English" }).map((a) => a.id)).not.toContain(
      "c-three",
    );
    expect(filterAdvisors(store, { province: "ON" }).map((a) => a.id)).not.toContain(
      "c-three",
    );
  });

  it("combines filters", () => {
    expect(filterAdvisors(store, { language: "English", province: "ON" })).toHaveLength(
      1,
    );
    expect(filterAdvisors(store, { language: "Spanish", province: "AB" })).toEqual([]);
  });
});

describe("which filters are offered", () => {
  it("offers none for the advisors the site has today", () => {
    // All seven work out of the same office and none has language data, so
    // every facet fails one bar or the other.
    expect(advisorFacets(getAdvisors())).toEqual([]);
    expect(directoryControls(getAdvisors()).enabled).toBe(false);
  });

  it("withholds a facet only one advisor carries", () => {
    const store = [
      advisor({ id: "a", languages: ["English", "Korean"] }),
      advisor({ id: "b" }),
    ];
    expect(advisorFacets(store)).toEqual([]);
  });

  it("withholds a facet where every advisor gives the same answer", () => {
    const store = [
      advisor({ id: "a", advisor: { province: "ON" } }),
      advisor({ id: "b", advisor: { province: "ON" } }),
    ];
    expect(advisorFacets(store)).toEqual([]);
  });

  it("offers a facet once two advisors differ on it", () => {
    const store = [
      advisor({ id: "a", languages: ["English", "Korean"] }),
      advisor({ id: "b", languages: ["English"] }),
    ];
    const [facet] = advisorFacets(store);
    expect(facet.key).toBe("language");
    expect(facet.options).toEqual([
      { value: "English", count: 2 },
      { value: "Korean", count: 1 },
    ]);
  });

  it("offers search only once the roster outgrows one screen", () => {
    const many = Array.from({ length: MIN_ADVISORS_FOR_SEARCH }, (_, i) =>
      advisor({ id: `a-${i}`, name: `Advisor ${i}` }),
    );
    expect(directoryControls(many).search).toBe(true);
    expect(directoryControls(many.slice(0, 3)).search).toBe(false);
  });
});

describe("related services", () => {
  it("links only the areas of focus that map to a real service page", () => {
    expect(relatedServicesFor(getPerson("johnathan-leung")!)).toEqual([
      { href: "/wealth-building", label: "Wealth Building" },
      { href: "/retirement-planning", label: "Retirement Planning" },
      { href: "/estate-planning", label: "Estate Planning" },
      { href: "/traditional-investments", label: "Traditional Investments" },
    ]);
  });

  it("links nothing for an advisor with no stated areas of focus", () => {
    expect(relatedServicesFor(advisor())).toEqual([]);
  });

  it("does not invent a service page for an unrecognised area", () => {
    expect(relatedServicesFor(advisor({ areasOfExpertise: ["Something Else"] }))).toEqual(
      [],
    );
  });

  it("never lists the same service twice", () => {
    const person = advisor({
      areasOfExpertise: ["Retirement Planning", "Retirement & Estate Planning"],
    });
    const hrefs = relatedServicesFor(person).map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
