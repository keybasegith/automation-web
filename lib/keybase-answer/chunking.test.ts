import { describe, expect, it } from "vitest";

import { chunkSections, type DocumentSection } from "@/lib/keybase-answer/chunking";
import {
  extractSections,
  sectionsToText,
} from "@/lib/keybase-answer/html-extract";
import { blocksToSections, isIndexablePath } from "@/lib/keybase-answer/content-loader";

const OPTIONS = { targetChars: 200, maxChars: 320, minChars: 60 };

function paragraph(word: string, count: number): string {
  return `${Array.from({ length: count }, () => word).join(" ")}.`;
}

describe("chunkSections", () => {
  it("cuts on section boundaries, not on a character count", () => {
    const sections: DocumentSection[] = [
      { heading: "Borrowing costs", paragraphs: ["Loans get dearer."] },
      { heading: "Fixed income", paragraphs: ["Yields rise."] },
    ];
    const chunks = chunkSections(sections, OPTIONS);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].heading).toBe("Borrowing costs");
    expect(chunks[1].heading).toBe("Fixed income");
  });

  it("opens every chunk with its heading, so a retrieved passage says what it is", () => {
    const chunks = chunkSections(
      [{ heading: "Fixed income", paragraphs: ["Yields rise."] }],
      OPTIONS,
    );
    expect(chunks[0].text.startsWith("Fixed income")).toBe(true);
  });

  it("splits a long section and overlaps the boundary", () => {
    const sections: DocumentSection[] = [
      {
        heading: "Rates",
        paragraphs: [
          paragraph("alpha", 12),
          paragraph("bravo", 12),
          paragraph("charlie", 12),
          paragraph("delta", 12),
        ],
      },
    ];
    const chunks = chunkSections(sections, OPTIONS);
    expect(chunks.length).toBeGreaterThan(1);
    // The paragraph that ended one chunk opens the next, so a claim split
    // across the boundary survives whole on one side of it.
    expect(chunks[1].text).toContain("bravo");
    expect(chunks[0].text).toContain("bravo");
  });

  it("folds a stub tail back into the chunk above it", () => {
    const sections: DocumentSection[] = [
      {
        heading: "Rates",
        paragraphs: [paragraph("alpha", 30), paragraph("bravo", 30), "In short."],
      },
    ];
    const chunks = chunkSections(sections, OPTIONS);
    expect(chunks.every((chunk) => chunk.text.length > OPTIONS.minChars)).toBe(true);
    expect(chunks[chunks.length - 1].text).toContain("In short.");
  });

  it("splits an over-long paragraph on sentence ends", () => {
    const long = Array.from(
      { length: 20 },
      (_, i) => `Sentence number ${i} runs on for a reasonable while.`,
    ).join(" ");
    const chunks = chunkSections([{ paragraphs: [long] }], OPTIONS);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.trim()).toMatch(/[.!?]$/);
    }
  });

  it("produces nothing for an empty document", () => {
    expect(chunkSections([], OPTIONS)).toEqual([]);
    expect(chunkSections([{ heading: "Empty", paragraphs: [] }], OPTIONS)).toEqual([]);
  });
});

describe("blocksToSections", () => {
  it("turns article blocks into headed sections", () => {
    const sections = blocksToSections([
      { type: "heading", level: 2, text: "Why rates matter" },
      { type: "paragraph", text: "Because borrowing costs move." },
      { type: "list", items: ["Mortgages", "Business loans"] },
      {
        type: "table",
        caption: "Policy rate",
        columns: ["Date", "Rate"],
        rows: [["July", "2.75%"]],
      },
      { type: "callout", title: "Note", text: "This is general information." },
      { type: "quote", text: "Rates are a tool.", attribution: "A economist" },
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Why rates matter");
    // A table is read row-wise so a retrieved figure keeps its column label.
    expect(sections[0].paragraphs.join("\n")).toContain("Date: July; Rate: 2.75%");
    expect(sections[0].paragraphs.join("\n")).toContain("Note: This is general");
  });

  it("keeps the lede that precedes the first heading", () => {
    const sections = blocksToSections([
      { type: "paragraph", text: "A standfirst." },
      { type: "heading", level: 2, text: "First" },
      { type: "paragraph", text: "Body." },
    ]);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBeUndefined();
  });
});

describe("extractSections", () => {
  const html = `
    <html><body>
      <nav><a href="/">Home</a><a href="/services">Our Services</a></nav>
      <header><p>Join our team.</p></header>
      <main>
        <h1>Tax-Free Savings Account</h1>
        <p>A TFSA lets your savings grow without tax.</p>
        <h2>Contribution room</h2>
        <p>Unused room carries forward.</p>
        <ul><li>Annual limit</li><li>Cumulative room</li></ul>
        <p>Learn more</p>
        <p>Learn more</p>
      </main>
      <footer><p>© Keybase Financial Group. All rights reserved.</p></footer>
    </body></html>`;

  it("reads only the main content", () => {
    const text = sectionsToText(extractSections(html));
    expect(text).toContain("A TFSA lets your savings grow without tax.");
    expect(text).not.toContain("Our Services");
    expect(text).not.toContain("Join our team");
    expect(text).not.toContain("All rights reserved");
  });

  it("uses headings as section boundaries", () => {
    const sections = extractSections(html);
    expect(sections.map((s) => s.heading)).toEqual([
      "Tax-Free Savings Account",
      "Contribution room",
    ]);
  });

  it("drops repeated calls to action", () => {
    const sections = extractSections(html);
    const learnMore = sections
      .flatMap((s) => s.paragraphs)
      .filter((p) => p === "Learn more");
    expect(learnMore).toHaveLength(0);
  });

  it("decodes entities", () => {
    const sections = extractSections(
      "<main><p>Rates &amp; markets &mdash; a note</p></main>",
    );
    expect(sections[0].paragraphs[0]).toBe("Rates & markets — a note");
  });
});

describe("isIndexablePath", () => {
  it.each([
    "/newsroom/canada-inflation",
    "/services/tfsa",
    "/about",
    "/our-advisors",
  ])("indexes the public page %s", (path) => {
    expect(isIndexablePath(path)).toBe(true);
  });

  it.each([
    "/website-admin-cms",
    "/website-admin-cms/newsroom",
    "/api/keybase-answer",
    "/dashboard/audit",
    "/content/articles/1",
    "/login",
    "/onboarding/step-1",
    "/secure-email-generator",
    "/financial-statement-generator",
    "/discrepancy-detector",
    "/bp-dailysettlement",
    "/net-settlement",
    "/smart-document-intake",
    "/finance-intelligence",
  ])("refuses the internal path %s", (path) => {
    expect(isIndexablePath(path)).toBe(false);
  });

  it("refuses anything that is not a plain site path", () => {
    expect(isIndexablePath("https://example.com/about")).toBe(false);
    expect(isIndexablePath("/about?preview=1")).toBe(false);
    expect(isIndexablePath("/about#top")).toBe(false);
  });
});
