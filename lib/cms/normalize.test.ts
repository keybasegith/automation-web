import { describe, it, expect } from "vitest";
import { safeUrl } from "@/lib/cms/validation";
import {
  normalizeNavigation,
  normalizeExecutives,
  normalizeGlobalSettings,
  normalizeServicePages,
  normalizeCareers,
  normalizeNewsroom,
} from "@/lib/cms/normalize";

describe("safeUrl", () => {
  it("accepts safe links", () => {
    for (const u of ["/about", "#", "#section", "https://x.com", "mailto:a@b.com", "tel:+1905"]) {
      expect(safeUrl(u).ok).toBe(true);
    }
  });

  it("rejects dangerous schemes", () => {
    for (const u of ["javascript:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc"]) {
      expect(safeUrl(u).ok).toBe(false);
    }
  });
});

describe("normalizeNavigation", () => {
  it("rejects a javascript: url in a nav child", () => {
    const result = normalizeNavigation({
      items: [
        {
          label: "Bad",
          url: "",
          children: [{ label: "x", url: "javascript:alert(1)" }],
        },
      ],
      utilityLinks: [],
    });
    expect("error" in result).toBe(true);
  });

  it("accepts a valid menu and defaults visibility to true", () => {
    const result = normalizeNavigation({
      items: [{ label: "Company", url: "", children: [{ label: "About", url: "/about" }] }],
      utilityLinks: [],
    });
    expect("value" in result).toBe(true);
    if ("value" in result) {
      expect(result.value.items[0].isVisible).toBe(true);
      expect(result.value.items[0].children[0].isVisible).toBe(true);
    }
  });
});

describe("normalizeExecutives", () => {
  it("requires name and title", () => {
    const result = normalizeExecutives({ people: [{ name: "", title: "CEO" }] });
    expect("error" in result).toBe(true);
  });

  it("preserves paragraph breaks and drops empties", () => {
    const result = normalizeExecutives({
      people: [{ name: "Jane", title: "CEO", paragraphs: ["one", "  ", "two"] }],
    });
    expect("value" in result).toBe(true);
    if ("value" in result) {
      expect(result.value.people[0].paragraphs).toEqual(["one", "two"]);
    }
  });
});

describe("normalizeServicePages", () => {
  it("requires a heading and intro", () => {
    const result = normalizeServicePages({
      pages: [{ slug: "tax-planning", heading: "", intro: "" }],
    });
    expect("error" in result).toBe(true);
  });

  it("ignores unknown slugs (fixed page set) and keeps valid ones", () => {
    const result = normalizeServicePages({
      pages: [
        { slug: "not-a-real-page", heading: "x", intro: "y" },
        {
          slug: "tax-planning",
          heading: "Keep more.",
          intro: "Tax-efficient investing matters.",
          heroImage: "/tax-planning1.jpg",
          ctaUrl: "/contact",
        },
      ],
    });
    expect("value" in result).toBe(true);
    if ("value" in result) {
      expect(result.value.pages).toHaveLength(1);
      expect(result.value.pages[0].slug).toBe("tax-planning");
      expect(result.value.pages[0].group).toBe("Wealth Planning");
    }
  });

  it("rejects a javascript: hero image or cta url", () => {
    const result = normalizeServicePages({
      pages: [
        {
          slug: "tax-planning",
          heading: "h",
          intro: "i",
          ctaUrl: "javascript:alert(1)",
        },
      ],
    });
    expect("error" in result).toBe(true);
  });
});

describe("normalizeCareers", () => {
  it("requires a title on every posting", () => {
    const result = normalizeCareers({
      hero: { eyebrow: "Careers", heading: "Join", intro: "..." },
      roles: [{ title: "", department: "Advisory" }],
    });
    expect("error" in result).toBe(true);
  });

  it("adds a new posting with defaults and assigns an id", () => {
    const result = normalizeCareers({
      hero: {},
      roles: [{ title: "New Advisor" }],
    });
    expect("value" in result).toBe(true);
    if ("value" in result) {
      expect(result.value.roles[0].title).toBe("New Advisor");
      expect(result.value.roles[0].isVisible).toBe(true);
      expect(result.value.roles[0].id).toBeTruthy();
    }
  });
});

describe("normalizeNewsroom", () => {
  it("requires a title on every article", () => {
    const result = normalizeNewsroom({
      hero: {},
      articles: [{ title: "", category: "Markets" }],
    });
    expect("error" in result).toBe(true);
  });

  it("defaults category to Firm News and keeps visibility", () => {
    const result = normalizeNewsroom({
      hero: {},
      articles: [{ title: "A new update", isVisible: false }],
    });
    expect("value" in result).toBe(true);
    if ("value" in result) {
      expect(result.value.articles[0].category).toBe("Firm News");
      expect(result.value.articles[0].isVisible).toBe(false);
    }
  });
});

describe("normalizeGlobalSettings", () => {
  it("requires a company name", () => {
    const result = normalizeGlobalSettings({ companyName: "  " });
    expect("error" in result).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = normalizeGlobalSettings({
      companyName: "Keybase",
      generalEmail: "not-an-email",
    });
    expect("error" in result).toBe(true);
  });
});
