import { describe, expect, it } from "vitest";
import {
  normalizePayload,
  payloadReadyToSubmit,
  readingTimeMinutes,
} from "./normalize";
import { emptyPayload, type ArticlePayload } from "./types";

/**
 * The validation gate.
 *
 * These tests are the enforcement of "Keybase owns the presentation": the
 * normalizer is the only way content reaches the store, so what it refuses to
 * carry cannot be published — no matter what the editor UI allows or what a
 * crafted request contains.
 */

function normalized(raw: unknown): ArticlePayload {
  const result = normalizePayload(raw);
  if ("error" in result) throw new Error(result.error);
  return result.value;
}

describe("presentation cannot be smuggled through", () => {
  it("drops every styling field an author might attach to a block", () => {
    const payload = normalized({
      body: [
        {
          type: "paragraph",
          text: "Inflation rose to 3.0%.",
          className: "text-red-500",
          style: { color: "red", fontSize: "48px" },
          width: "full",
          html: "<script>alert(1)</script>",
        },
      ],
    });

    expect(payload.body).toEqual([
      { type: "paragraph", text: "Inflation rose to 3.0%." },
    ]);
  });

  it("refuses block types the Keybase template does not render", () => {
    const payload = normalized({
      body: [
        { type: "html", html: "<div style='color:red'>hi</div>" },
        { type: "embed", url: "https://example.com" },
        { type: "spacer", height: 200 },
        { type: "paragraph", text: "Kept." },
      ],
    });

    expect(payload.body).toEqual([{ type: "paragraph", text: "Kept." }]);
  });

  it("clamps headings to the two levels the template has", () => {
    const payload = normalized({
      body: [
        { type: "heading", level: 1, text: "Would compete with the headline" },
        { type: "heading", level: 6, text: "Not a size control" },
        { type: "heading", level: 3, text: "A real subsection" },
      ],
    });

    expect(payload.body.map((b) => b.type === "heading" && b.level)).toEqual([
      2,
      2,
      3,
    ]);
  });
});

describe("links", () => {
  it("keeps http and https source URLs", () => {
    const payload = normalized({
      sources: [
        {
          label: "Statistics Canada",
          title: "Consumer Price Index, July 2026",
          url: "https://www150.statcan.gc.ca/example",
        },
      ],
    });
    expect(payload.sources[0].url).toBe("https://www150.statcan.gc.ca/example");
  });

  it("strips a script-bearing URL but keeps the citation itself", () => {
    const payload = normalized({
      sources: [
        {
          label: "Bank of Canada",
          title: "Monetary Policy Report",
          url: "javascript:alert(document.cookie)",
        },
      ],
    });
    // The evidence survives; only the unusable link is dropped.
    expect(payload.sources[0]).toEqual({
      label: "Bank of Canada",
      title: "Monetary Policy Report",
    });
  });

  it.each([
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "not a url at all",
  ])("drops %s", (url) => {
    const payload = normalized({
      sources: [{ label: "Org", title: "Doc", url }],
    });
    expect(payload.sources[0].url).toBeUndefined();
  });

  it("refuses a hero image hosted somewhere Keybase does not control", () => {
    const payload = normalized({
      heroImage: { key: "https://evil.example.com/tracker.png", alt: "x" },
    });
    expect(payload.heroImage).toBeNull();
  });

  it("refuses a byline linking off the site", () => {
    const payload = normalized({
      authorByline: {
        name: "Sarah Chen",
        role: "Senior Financial Advisor",
        profilePath: "https://sarahchen.example.com",
      },
    });
    expect(payload.authorByline?.name).toBe("Sarah Chen");
    expect(payload.authorByline?.profilePath).toBeUndefined();
  });
});

describe("shape", () => {
  it("returns a complete payload from an empty request", () => {
    expect(normalized({})).toEqual(emptyPayload());
  });

  it("never fails on a half-written draft", () => {
    // Autosave has to accept whatever is on screen mid-sentence.
    const result = normalizePayload({ title: "Canada's inflation ra" });
    expect("error" in result).toBe(false);
  });

  it("pads a ragged table to its column count", () => {
    const payload = normalized({
      body: [
        {
          type: "table",
          columns: ["Year", "CPI", "Core"],
          rows: [["2026", "3.0"], ["2025", "2.8", "2.1", "extra"]],
        },
      ],
    });
    const table = payload.body[0];
    expect(table.type).toBe("table");
    if (table.type !== "table") throw new Error("unreachable");
    expect(table.rows).toEqual([
      ["2026", "3.0", ""],
      ["2025", "2.8", "2.1"],
    ]);
  });

  it("de-duplicates and lowercases tags", () => {
    const payload = normalized({ tags: ["Inflation", "inflation", " Markets "] });
    expect(payload.tags).toEqual(["inflation", "markets"]);
  });

  it("drops empty list items but keeps the list", () => {
    const payload = normalized({
      body: [{ type: "list", items: ["One", "", "  ", "Two"] }],
    });
    expect(payload.body).toEqual([{ type: "list", items: ["One", "Two"] }]);
  });
});

describe("submit readiness", () => {
  const long = Array.from({ length: 150 }, (_, i) => `word${i}`).join(" ");

  function ready(overrides: Partial<ArticlePayload> = {}): ArticlePayload {
    return {
      ...emptyPayload(),
      title: "What the July CPI reading means",
      excerpt: "A short summary of the piece.",
      body: [{ type: "paragraph", text: long }],
      ...overrides,
    };
  }

  it("accepts a complete article", () => {
    expect(payloadReadyToSubmit(ready())).toEqual([]);
  });

  it("asks for a title, an excerpt, and a body", () => {
    const problems = payloadReadyToSubmit(emptyPayload());
    expect(problems).toHaveLength(3);
    expect(problems.join(" ")).toMatch(/title/i);
    expect(problems.join(" ")).toMatch(/excerpt/i);
    expect(problems.join(" ")).toMatch(/no content/i);
  });

  it("refuses a hero image with no alt text", () => {
    const problems = payloadReadyToSubmit(
      ready({ heroImage: { key: "uploads/hero.jpg", alt: "", width: 0, height: 0 } })
    );
    expect(problems).toEqual(["Add alt text describing the hero image."]);
  });

  it("names the incomplete source by position", () => {
    const problems = payloadReadyToSubmit(
      ready({
        sources: [
          { label: "Statistics Canada", title: "CPI, July 2026" },
          { label: "", title: "Missing organization" },
        ],
      })
    );
    expect(problems).toEqual(["Source 2 needs both an organization and a title."]);
  });

  it("flags an article too short to be worth reviewing", () => {
    const problems = payloadReadyToSubmit(
      ready({ body: [{ type: "paragraph", text: "Too short." }] })
    );
    expect(problems.join(" ")).toMatch(/very short/i);
  });
});

describe("reading time", () => {
  it("is zero for an empty article and at least a minute for any content", () => {
    expect(readingTimeMinutes(emptyPayload())).toBe(0);
    expect(
      readingTimeMinutes({
        ...emptyPayload(),
        body: [{ type: "paragraph", text: "Three little words." }],
      })
    ).toBe(1);
  });

  it("counts words across every block type", () => {
    const words = Array.from({ length: 450 }, (_, i) => `w${i}`);
    const minutes = readingTimeMinutes({
      ...emptyPayload(),
      body: [
        { type: "heading", level: 2, text: words.slice(0, 50).join(" ") },
        { type: "list", items: [words.slice(50, 200).join(" ")] },
        { type: "quote", text: words.slice(200, 450).join(" ") },
      ],
    });
    expect(minutes).toBe(2);
  });
});
