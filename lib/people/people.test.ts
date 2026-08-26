import { describe, expect, it } from "vitest";

import {
  MIN_BIO_PARAGRAPHS,
  PEOPLE,
  getByline,
  getPeopleByType,
  getPerson,
  getPersonByName,
  getProfilePeople,
  isProfileReady,
  personSlug,
  profilePath,
} from "./people";
import {
  articleAuthor,
  articleReviewer,
  articlesByAuthor,
  articlesReviewedBy,
  getArticlesByAuthor,
  getArticlesReviewedBy,
} from "@/lib/insights/attribution";
import type { InsightArticle } from "@/lib/insights/types";
import type { PersonProfile } from "./types";

function person(overrides: Partial<PersonProfile> = {}): PersonProfile {
  return {
    id: "test-person",
    name: "Test Person",
    role: "Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["author"],
    ...overrides,
  };
}

const IMAGE = { src: "/x.jpg", alt: "Portrait of Test Person", width: 100, height: 120 };

function article(overrides: Partial<InsightArticle> = {}): InsightArticle {
  return {
    slug: "example",
    kind: "educational",
    category: "Retirement",
    title: "Example",
    excerpt: "An example.",
    publishedAt: "2026-06-22",
    body: [{ type: "paragraph", text: "Body." }],
    ...overrides,
  };
}

describe("the registry", () => {
  it("holds one record per id", () => {
    const ids = PEOPLE.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every person an id matching their name, so links stay guessable", () => {
    for (const entry of PEOPLE) {
      expect(entry.id).toBe(personSlug(entry.name));
    }
  });

  it("gives every person at least one role and a name", () => {
    for (const entry of PEOPLE) {
      expect(entry.name.trim()).not.toBe("");
      expect(entry.profileTypes.length).toBeGreaterThan(0);
    }
  });

  it("claims no credentials, languages, or professional links for anyone", () => {
    // The site records none. If this ever fails, it is because someone was
    // given a designation, a language, or a LinkedIn URL that has to be
    // traceable to approved content — not because the test is stale.
    for (const entry of PEOPLE) {
      expect(entry.credentials).toBeUndefined();
      expect(entry.languages).toBeUndefined();
      expect(entry.professionalProfiles).toBeUndefined();
    }
  });

  it("claims expertise only for the one person whose page prints it", () => {
    const withExpertise = PEOPLE.filter((p) => p.areasOfExpertise?.length);
    expect(withExpertise.map((p) => p.id)).toEqual(["johnathan-leung"]);
  });

  it("claims no client types or service areas for any advisor", () => {
    // An office address is not a service area, and no advisor's page states
    // who they work with.
    for (const entry of PEOPLE) {
      expect(entry.advisor?.clientTypes).toBeUndefined();
      expect(entry.advisor?.serviceAreas).toBeUndefined();
    }
  });

  it("finds a person by id and by name", () => {
    expect(getPerson("mark-garcia")?.name).toBe("Mark Garcia");
    expect(getPersonByName("Mark Garcia")?.id).toBe("mark-garcia");
  });

  it("resolves an unknown or empty id to nothing", () => {
    expect(getPerson("no-such-person")).toBeUndefined();
    expect(getPerson(undefined)).toBeUndefined();
    expect(getPersonByName("Nobody At All")).toBeUndefined();
  });

  it("lists people by the roles they hold", () => {
    const leadership = getPeopleByType("leadership");
    const advisors = getPeopleByType("advisor");
    expect(leadership.length).toBe(7);
    expect(advisors.length).toBe(7);
    // Nobody currently holds both, and no record is missing from the split.
    expect(leadership.length + advisors.length).toBe(PEOPLE.length);
  });
});

describe("the thin-profile guardrail", () => {
  it("refuses a page to someone who is only a name and a title", () => {
    expect(isProfileReady(person())).toBe(false);
  });

  it("refuses a page to someone with a portrait but no biography", () => {
    expect(isProfileReady(person({ image: IMAGE }))).toBe(false);
  });

  it("refuses a page to someone with one paragraph and no portrait", () => {
    expect(isProfileReady(person({ bio: ["One paragraph."] }))).toBe(false);
  });

  it("publishes a page once there is a portrait and a real biography", () => {
    const bio = Array.from({ length: MIN_BIO_PARAGRAPHS }, (_, i) => `Paragraph ${i}.`);
    expect(isProfileReady(person({ image: IMAGE, bio }))).toBe(true);
  });

  it("holds back people whose portrait has not been published", () => {
    const pending = PEOPLE.filter((p) => p.portraitPending);
    expect(pending.map((p) => p.id)).toEqual(["linda-yang", "neil-alford"]);
    for (const person of pending) {
      expect(getProfilePeople().map((p) => p.id)).not.toContain(person.id);
    }
  });

  it("publishes a profile for six leaders and no advisor at all", () => {
    // No advisor has a biography anywhere in the repository, so none of them
    // clears the bar. This is the guardrail working, not a gap in the data
    // model — see the advisor list in people.ts.
    const published = getProfilePeople();
    expect(published.map((p) => p.id)).toEqual([
      "dax-sukhraj",
      "keith-sutherland",
      "krissy-sukhraj",
      "mark-garcia",
      "pushpa-shivanthan",
      "jerome-pare",
    ]);
    expect(published.some((p) => p.profileTypes.includes("advisor"))).toBe(false);
  });
});

describe("bylines", () => {
  it("links a name only when that person has a profile page", () => {
    expect(getByline("mark-garcia")?.profilePath).toBe(profilePath("mark-garcia"));
    expect(getByline("linda-yang")?.profilePath).toBeUndefined();
  });

  it("carries the person's own title, so an article cannot restate it", () => {
    expect(getByline("mark-garcia")).toMatchObject({
      name: "Mark Garcia",
      role: "Chief Compliance Officer",
    });
  });

  it("returns nothing for an unknown or absent id", () => {
    expect(getByline("someone-else")).toBeUndefined();
    expect(getByline(undefined)).toBeUndefined();
  });
});

describe("article attribution", () => {
  it("resolves an author and a reviewer from their ids", () => {
    const piece = article({ authorId: "dax-sukhraj", reviewerId: "mark-garcia" });
    expect(articleAuthor(piece)?.name).toBe("Dax Sukhraj");
    expect(articleReviewer(piece)?.name).toBe("Mark Garcia");
  });

  it("resolves nothing when an article names nobody", () => {
    expect(articleAuthor(article())).toBeUndefined();
    expect(articleReviewer(article())).toBeUndefined();
  });

  it("filters a store down to what one person wrote and what they reviewed", () => {
    const store = [
      article({ slug: "a", authorId: "dax-sukhraj", reviewerId: "mark-garcia" }),
      article({ slug: "b", authorId: "mark-garcia" }),
      article({ slug: "c" }),
    ];
    expect(articlesByAuthor(store, "dax-sukhraj").map((a) => a.slug)).toEqual(["a"]);
    expect(articlesReviewedBy(store, "mark-garcia").map((a) => a.slug)).toEqual(["a"]);
    expect(articlesByAuthor(store, "keith-sutherland")).toEqual([]);
  });

  it("does not count a person reviewing their own piece as a review", () => {
    const store = [article({ authorId: "mark-garcia", reviewerId: "mark-garcia" })];
    expect(articlesByAuthor(store, "mark-garcia")).toHaveLength(1);
    expect(articlesReviewedBy(store, "mark-garcia")).toEqual([]);
  });

  it("lists no articles for anyone while the store is empty", () => {
    // Nothing is published yet, so every profile omits both article sections
    // rather than rendering an empty heading.
    for (const entry of PEOPLE) {
      expect(getArticlesByAuthor(entry.id)).toEqual([]);
      expect(getArticlesReviewedBy(entry.id)).toEqual([]);
    }
  });
});
