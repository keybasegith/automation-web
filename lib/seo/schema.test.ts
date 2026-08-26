import { afterEach, describe, expect, it } from "vitest";

import {
  buildArticle,
  buildBreadcrumbs,
  buildFinancialService,
  buildJobPosting,
  buildOrganization,
  buildPerson,
  buildProfilePage,
  compact,
  schemaDocument,
} from "./schema";
import { absoluteUrl, entityId, siteUrl, __resetSiteUrlWarning } from "./siteUrl";
import { serialize } from "./jsonLd";
import {
  keybasePeopleSchema,
  keybasePerson,
  keybaseProfilePageSchema,
  officialProfileUrls,
} from "./keybase";
import { getPerson, getProfilePeople } from "@/lib/people/people";

const STAGING = "https://automation-web-red.vercel.app";

function withSiteUrl(value: string | undefined, run: () => void) {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  if (value === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
}

afterEach(__resetSiteUrlWarning);

describe("siteUrl", () => {
  it("returns null when no production domain is configured", () => {
    withSiteUrl(undefined, () => {
      expect(siteUrl()).toBeNull();
      expect(absoluteUrl("/about")).toBeUndefined();
      expect(entityId("organization")).toBeUndefined();
    });
  });

  it("never accepts a deploy-preview host as a permanent identity", () => {
    withSiteUrl(STAGING, () => {
      expect(siteUrl()).toBeNull();
      expect(absoluteUrl("/about")).toBeUndefined();
      expect(entityId("organization")).toBeUndefined();
    });
  });

  it("ignores localhost and malformed values", () => {
    withSiteUrl("http://localhost:3000", () => expect(siteUrl()).toBeNull());
    withSiteUrl("not-a-url", () => expect(siteUrl()).toBeNull());
  });

  it("builds absolute URLs and stable ids once a domain is configured", () => {
    withSiteUrl("https://keybase.example.ca", () => {
      expect(siteUrl()).toBe("https://keybase.example.ca");
      expect(absoluteUrl("/retirement-planning")).toBe(
        "https://keybase.example.ca/retirement-planning",
      );
      expect(entityId("organization")).toBe("https://keybase.example.ca/#organization");
    });
  });
});

describe("compact", () => {
  it("drops undefined, null, empty strings, arrays, and objects", () => {
    expect(
      compact({
        "@type": "Thing",
        name: "Keep",
        blank: "",
        spaces: "   ",
        nothing: undefined,
        nulled: null,
        empties: [],
        hollow: { "@type": "PostalAddress" },
      }),
    ).toEqual({ "@type": "Thing", name: "Keep" });
  });

  it("keeps nested nodes that carry real values", () => {
    expect(
      compact({
        "@type": "Thing",
        address: { "@type": "PostalAddress", postalCode: "L4B 0B3", streetAddress: "" },
      }),
    ).toEqual({
      "@type": "Thing",
      address: { "@type": "PostalAddress", postalCode: "L4B 0B3" },
    });
  });
});

describe("buildOrganization", () => {
  it("emits only the fields it was given", () => {
    withSiteUrl(undefined, () => {
      const org = buildOrganization({
        name: "Keybase Financial Group",
        legalName: "Keybase Financial Group Inc.",
        telephone: "+1 905-709-7911",
        address: { addressLocality: "Richmond Hill", addressCountry: "CA" },
        idFragment: "organization",
      });

      expect(org).toEqual({
        "@type": "Organization",
        name: "Keybase Financial Group",
        legalName: "Keybase Financial Group Inc.",
        telephone: "+1 905-709-7911",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Richmond Hill",
          addressCountry: "CA",
        },
      });
      // No domain configured: no url, no logo, no @id, and nothing invented.
      expect(Object.keys(org)).not.toContain("url");
      expect(Object.keys(org)).not.toContain("logo");
      expect(Object.keys(org)).not.toContain("@id");
      expect(Object.keys(org)).not.toContain("foundingDate");
    });
  });

  it("adds a stable @id once a production domain exists", () => {
    withSiteUrl("https://keybase.example.ca", () => {
      const org = buildOrganization({ name: "Keybase Financial Group", idFragment: "organization" });
      expect(org["@id"]).toBe("https://keybase.example.ca/#organization");
    });
  });
});

describe("buildFinancialService", () => {
  it("represents area served as a Country and references its parent", () => {
    withSiteUrl(undefined, () => {
      const node = buildFinancialService({
        name: "Keybase Financial Group",
        areaServed: "Canada",
        parentOrganization: { name: "Keybase Financial Group", idFragment: "organization" },
      });
      expect(node["@type"]).toBe("FinancialService");
      expect(node.areaServed).toEqual({ "@type": "Country", name: "Canada" });
      // Without a domain there is no @id to point at, so the parent is named inline.
      expect(node.parentOrganization).toEqual({
        "@type": "Organization",
        name: "Keybase Financial Group",
      });
    });
  });
});

describe("buildPerson", () => {
  it("omits sameAs, image, and url when none are supplied", () => {
    const person = buildPerson({
      name: "Dax Sukhraj",
      jobTitle: "President & CEO",
      worksFor: { name: "Keybase Financial Group", idFragment: "organization" },
    });
    expect(person).toEqual({
      "@type": "Person",
      name: "Dax Sukhraj",
      jobTitle: "President & CEO",
      worksFor: { "@type": "Organization", name: "Keybase Financial Group" },
    });
    expect(Object.keys(person)).not.toContain("sameAs");
    expect(Object.keys(person)).not.toContain("knowsAbout");
  });

  it("wraps a person in a ProfilePage", () => {
    const page = buildProfilePage({ person: { name: "Dax Sukhraj" } });
    expect(page["@type"]).toBe("ProfilePage");
    expect(page.mainEntity).toEqual({ "@type": "Person", name: "Dax Sukhraj" });
  });
});

describe("people schema", () => {
  const mark = getPerson("mark-garcia")!;
  const linda = getPerson("linda-yang")!;

  it("describes a person with only what the site publishes about them", () => {
    withSiteUrl(undefined, () => {
      const node = keybasePerson(mark);
      expect(node).toEqual({
        "@type": "Person",
        name: "Mark Garcia",
        jobTitle: "Chief Compliance Officer",
        description: mark.shortBio,
        worksFor: { "@type": "Organization", name: "Keybase Financial Group" },
      });
      // No designation, expertise list, or social profile is asserted, because
      // the site states none.
      expect(Object.keys(node)).not.toContain("knowsAbout");
      expect(Object.keys(node)).not.toContain("sameAs");
    });
  });

  it("omits the profile url for a person who has no profile page", () => {
    withSiteUrl("https://example.com", () => {
      expect(keybasePerson(mark).url).toBe("https://example.com/people/mark-garcia");
      expect(keybasePerson(linda).url).toBeUndefined();
    });
  });

  it("emits no url or image on a profile page until a domain is configured", () => {
    withSiteUrl(undefined, () => {
      const page = keybaseProfilePageSchema(mark)!;
      expect(page["@type"]).toBe("ProfilePage");
      expect(Object.keys(page)).not.toContain("url");
      expect(Object.keys(page.mainEntity as object)).not.toContain("image");
    });
  });

  it("never pins a person to the staging host", () => {
    withSiteUrl(STAGING, () => {
      expect(serialize(keybaseProfilePageSchema(mark)!)).not.toContain("vercel.app");
    });
  });

  it("emits one Person node per published leader, and none for a nameless record", () => {
    withSiteUrl(undefined, () => {
      const doc = keybasePeopleSchema(getProfilePeople())!;
      expect((doc["@graph"] as unknown[]).length).toBe(getProfilePeople().length);
      expect(keybasePeopleSchema([])).toBeNull();
    });
  });
});

describe("buildBreadcrumbs", () => {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Wealth Planning", path: "/services" },
    { name: "Retirement Planning", path: "/retirement-planning" },
  ];

  it("emits nothing without a production domain rather than a relative trail", () => {
    withSiteUrl(undefined, () => expect(buildBreadcrumbs(trail)).toBeNull());
  });

  it("never falls back to the staging host", () => {
    withSiteUrl(STAGING, () => expect(buildBreadcrumbs(trail)).toBeNull());
  });

  it("produces positioned items once a domain is configured", () => {
    withSiteUrl("https://keybase.example.ca", () => {
      const crumbs = buildBreadcrumbs(trail);
      expect(crumbs).toEqual({
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://keybase.example.ca/" },
          {
            "@type": "ListItem",
            position: 2,
            name: "Wealth Planning",
            item: "https://keybase.example.ca/services",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Retirement Planning",
            item: "https://keybase.example.ca/retirement-planning",
          },
        ],
      });
    });
  });

  it("returns null for an empty trail", () => {
    expect(buildBreadcrumbs([])).toBeNull();
  });
});

describe("buildArticle", () => {
  it("refuses to build without a real publication date", () => {
    expect(buildArticle({ headline: "Markets in review" })).toBeNull();
    expect(buildArticle({ headline: "", datePublished: "2026-06-22" })).toBeNull();
  });

  it("omits an absent reviewer and image", () => {
    const article = buildArticle({
      headline: "Markets in review",
      datePublished: "2026-06-22",
      author: { name: "Keybase Research" },
      publisher: { name: "Keybase Financial Group", idFragment: "organization" },
      type: "BlogPosting",
    });
    expect(article?.["@type"]).toBe("BlogPosting");
    expect(Object.keys(article ?? {})).not.toContain("reviewedBy");
    expect(Object.keys(article ?? {})).not.toContain("image");
    expect(Object.keys(article ?? {})).not.toContain("dateModified");
  });
});

describe("buildJobPosting", () => {
  it("refuses generic career marketing with no posting date", () => {
    expect(
      buildJobPosting({ title: "Financial Advisor", description: "Join our team." }),
    ).toBeNull();
  });

  it("builds a posting when title, description, and date are all present", () => {
    const posting = buildJobPosting({
      title: "Financial Advisor",
      description: "Advise clients on wealth planning.",
      datePosted: "2026-08-01",
      hiringOrganization: { name: "Keybase Financial Group" },
      jobLocation: { addressLocality: "Richmond Hill", addressCountry: "CA" },
    });
    expect(posting?.title).toBe("Financial Advisor");
    expect(posting?.jobLocation).toEqual({
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Richmond Hill",
        addressCountry: "CA",
      },
    });
  });
});

describe("officialProfileUrls", () => {
  it("keeps profile URLs and drops bare platform homepages", () => {
    expect(
      officialProfileUrls([
        { url: "https://www.linkedin.com/company/keybase" },
        { url: "https://x.com" },
        { url: "https://instagram.com" },
        { url: "https://youtube.com/" },
        { url: "" },
        { url: "not-a-url" },
      ]),
    ).toEqual(["https://www.linkedin.com/company/keybase"]);
  });
});

describe("schemaDocument and serialization", () => {
  it("returns null when there is nothing to say", () => {
    expect(schemaDocument([])).toBeNull();
  });

  it("uses a bare node for one entity and @graph for several", () => {
    expect(schemaDocument([{ "@type": "Organization" }])).toEqual({
      "@context": "https://schema.org",
      "@type": "Organization",
    });
    const many = schemaDocument([{ "@type": "Person" }, { "@type": "Person" }]);
    expect(Array.isArray(many?.["@graph"])).toBe(true);
  });

  it("escapes sequences that could break out of a script element", () => {
    const output = serialize({ "@type": "Thing", name: "</script><img src=x>" });
    expect(output).not.toContain("</script>");
    expect(JSON.parse(output.replace(/\\u003c/g, "<")).name).toBe("</script><img src=x>");
  });
});
