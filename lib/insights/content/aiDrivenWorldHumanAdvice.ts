import type { InsightArticle } from "../types";

/**
 * Perspectives — how Keybase sees the place of AI in financial advice.
 *
 * Not a market piece and not an announcement: it is the firm talking about its
 * own approach, which is why it carries its own category rather than joining
 * the Market Perspectives run. `kind` is "company-news" because it reports
 * nothing about markets or tax rules — but `showDisclaimer` is set explicitly,
 * since a piece about how advice is given should still say that reading it is
 * not receiving advice. The kind alone would have suppressed it.
 *
 * The five pillars are `callout` blocks rather than headings. They are labelled
 * one-sentence claims, not sections, and rendering them as headings would hand
 * a 400-word brand piece a table of contents it does not need.
 *
 * The deck is the opening line of the supplied copy, so the body starts at the
 * second — ArticleHeader already prints it above the fold.
 */
export const AI_DRIVEN_WORLD_HUMAN_ADVICE: InsightArticle = {
  slug: "ai-driven-world-financial-advice-still-human",
  kind: "company-news",
  category: "Perspectives",
  eyebrow: "Keybase Perspectives",
  title: "In an AI-driven world, financial advice is still deeply human.",
  deck: "Technology can surface the options. A trusted advisor helps you decide what truly fits your life.",
  excerpt:
    "AI can analyze data and compare products faster than ever. But financial decisions involve family priorities, business interests, tax considerations and life events that rarely fit neatly into an algorithm.",

  publishedAt: "2026-09-17",

  seoTitle:
    "In an AI-Driven World, Financial Advice Is Still Deeply Human | Keybase Financial Group",
  seoDescription:
    "Technology can surface the options; an advisor helps you decide what fits your life. How Keybase's independent, open-architecture approach puts human judgment at the centre of financial advice.",

  /** The photograph the homepage carousel already carries this piece on. */
  heroImage: {
    src: "/profile-backgroundpic.jpg",
    alt: "Downtown office towers photographed from street level",
    width: 6000,
    height: 4000,
  },

  /**
   * A piece about how advice is given is not itself advice. "company-news"
   * would have dropped the standard disclosure, so it is asked for by name.
   */
  showDisclaimer: true,

  body: [
    {
      type: "paragraph",
      text: "AI can analyze data, compare products and organize information faster than ever. But meaningful financial decisions are rarely based on numbers alone.",
    },
    {
      type: "paragraph",
      text: "They involve family priorities, business interests, tax considerations, risk tolerance, time horizons and life events that do not always fit neatly into an algorithm.",
    },
    {
      type: "paragraph",
      text: "At Keybase Financial Group, technology supports the advisory process — it does not replace it.",
    },
    {
      type: "paragraph",
      text: "Because Keybase is independent, open-architecture and not owned by a bank, our advisors are not confined to one institution's product shelf. We can evaluate a broad range of strategies and solutions and focus on what we believe is best suited to each client — not what a single institution needs to sell.",
    },
    {
      type: "paragraph",
      text: "Our role is not simply to present products. It is to help clients understand their options, weigh the trade-offs and make informed decisions with confidence.",
    },

    {
      type: "callout",
      title: "Independent by design",
      text: "Keybase is not owned by a bank, giving our advisors greater flexibility in how they evaluate financial solutions.",
    },
    {
      type: "callout",
      title: "Open architecture",
      text: "We can consider a broad range of products, strategies and providers rather than being limited to a single institution's shelf.",
    },
    {
      type: "callout",
      title: "Advice without product bias",
      text: "There is no mandate to push one specific product. Recommendations are guided by the client's goals, circumstances and long-term priorities.",
    },
    {
      type: "callout",
      title: "Human judgment where it matters",
      text: "Complex financial decisions often involve competing priorities, changing circumstances and personal values. An advisor helps connect the numbers to the realities of the client's life.",
    },
    {
      type: "callout",
      title: "Technology as a tool, not a replacement",
      text: "AI and digital tools can improve research, comparison and analysis. Human advisors provide context, interpretation, accountability and continuity over time.",
    },

    {
      type: "quote",
      text: "AI can inform the decision. Human judgment gives it context.",
    },
  ],
};
