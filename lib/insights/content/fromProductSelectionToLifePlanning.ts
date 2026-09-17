import type { InsightArticle } from "../types";

/**
 * Perspectives — why the planning conversation should start with the client
 * rather than the product.
 *
 * Firm voice, not market commentary: no figures, no sources, and no external
 * data to date-stamp. `showDisclaimer` is set explicitly because "company-news"
 * would otherwise drop the standard disclosure, and a piece about how advice is
 * given should still say that reading it is not receiving advice.
 *
 * The one-line paragraphs are the supplied copy's own cadence ("A mutual fund. /
 * An insurance policy."), kept as separate paragraphs rather than folded into
 * bullet lists, which would flatten the rhythm the piece is written in.
 */
export const FROM_PRODUCT_SELECTION_TO_LIFE_PLANNING: InsightArticle = {
  slug: "from-product-selection-to-life-planning",
  kind: "company-news",
  category: "Perspectives",
  eyebrow: "Keybase Perspectives",
  title: "From Product Selection to Life Planning",
  deck: "The most important financial question is not “Which product should I buy?” It is “What am I trying to build?”",
  excerpt:
    "Financial advice has traditionally been associated with products. But products are only tools. We look at why the planning conversation should begin with the life a client is trying to build.",

  publishedAt: "2026-09-17",

  seoTitle:
    "From Product Selection to Life Planning | Keybase Financial Group",
  seoDescription:
    "Products are tools, not plans. Why Keybase begins the financial conversation with the client's objectives, time horizon and priorities before any product is selected.",

  heroImage: {
    src: "/retirement-planning1.jpg",
    alt: "An older couple reviewing information together on a tablet at their kitchen table",
    width: 2272,
    height: 1284,
  },

  showDisclaimer: true,

  body: [
    {
      type: "paragraph",
      text: "Financial advice has traditionally been associated with products.",
    },
    { type: "paragraph", text: "A mutual fund." },
    { type: "paragraph", text: "An insurance policy." },
    { type: "paragraph", text: "A retirement account." },
    { type: "paragraph", text: "A mortgage strategy." },
    { type: "paragraph", text: "An investment portfolio." },
    { type: "paragraph", text: "But products are only tools." },
    {
      type: "paragraph",
      text: "The real purpose of financial planning is to connect those tools to the life a client is trying to create.",
    },
    {
      type: "paragraph",
      text: "At Keybase Financial Group, we believe the conversation should begin with the client — not the product.",
    },

    { type: "heading", level: 2, text: "Start with the life, not the investment" },
    {
      type: "paragraph",
      text: "Before selecting any financial solution, there are more important questions to answer.",
    },
    { type: "paragraph", text: "What does financial security mean to you?" },
    { type: "paragraph", text: "What kind of retirement do you want?" },
    {
      type: "paragraph",
      text: "Do you plan to support children or other family members?",
    },
    { type: "paragraph", text: "Are you building a business?" },
    { type: "paragraph", text: "Do you want to purchase property?" },
    { type: "paragraph", text: "How important is liquidity?" },
    {
      type: "paragraph",
      text: "What risks would materially affect your financial life?",
    },
    {
      type: "paragraph",
      text: "What do you want your wealth to accomplish over the next five, ten or thirty years?",
    },
    {
      type: "paragraph",
      text: "These questions create the context in which investment decisions should be made.",
    },
    {
      type: "paragraph",
      text: "A portfolio can only be considered appropriate when it is connected to the goals it is designed to support.",
    },

    {
      type: "heading",
      level: 2,
      text: "Financial decisions do not exist in isolation",
    },
    {
      type: "paragraph",
      text: "A decision that looks attractive on its own can create unintended consequences elsewhere.",
    },
    {
      type: "paragraph",
      text: "For example, an investor may want to maximize long-term returns while also needing significant liquidity within a few years.",
    },
    {
      type: "paragraph",
      text: "A business owner may want to invest aggressively while also needing capital available for expansion.",
    },
    {
      type: "paragraph",
      text: "A family may be focused on retirement while simultaneously planning for education costs, insurance needs and future estate considerations.",
    },
    {
      type: "paragraph",
      text: "That is why financial planning cannot simply be a collection of separate products.",
    },
    { type: "paragraph", text: "The pieces need to work together." },
    {
      type: "paragraph",
      text: "Investment strategy, cash flow, retirement planning, insurance, tax considerations, estate objectives and major life decisions are interconnected.",
    },
    {
      type: "paragraph",
      text: "The role of an advisor is to help clients understand those connections.",
    },

    { type: "heading", level: 2, text: "The product should follow the plan" },
    { type: "paragraph", text: "Product selection still matters." },
    { type: "paragraph", text: "Costs matter." },
    { type: "paragraph", text: "Risk matters." },
    { type: "paragraph", text: "Structure matters." },
    {
      type: "paragraph",
      text: "The underlying investment or financial solution matters.",
    },
    {
      type: "paragraph",
      text: "But those decisions should come after the client's objectives have been clearly defined.",
    },
    {
      type: "paragraph",
      text: "A product can be technically strong and still be inappropriate for a particular client.",
    },
    {
      type: "paragraph",
      text: "The question is not simply whether a product is attractive.",
    },
    {
      type: "paragraph",
      text: "The better question is whether it fits the client's circumstances, objectives, time horizon, risk tolerance and broader financial strategy.",
    },
    {
      type: "paragraph",
      text: "At Keybase, we believe products should support the plan — not define it.",
    },

    { type: "heading", level: 2, text: "Why open architecture matters" },
    {
      type: "paragraph",
      text: "This approach is particularly important when financial advice is delivered through an open-architecture model.",
    },
    {
      type: "paragraph",
      text: "Keybase is independent and not owned by a bank.",
    },
    {
      type: "paragraph",
      text: "Our advisors are not confined to one institution's product shelf.",
    },
    {
      type: "paragraph",
      text: "That gives us the ability to consider a broad range of strategies and solutions when evaluating what may be appropriate for a client.",
    },
    {
      type: "paragraph",
      text: "The objective is not to begin with a product and find a client who fits it.",
    },
    {
      type: "paragraph",
      text: "It is to understand the client first and then evaluate the solutions that may fit the plan.",
    },

    { type: "heading", level: 2, text: "Planning changes as life changes" },
    { type: "paragraph", text: "Financial planning is not a one-time exercise." },
    { type: "paragraph", text: "Careers change." },
    { type: "paragraph", text: "Families grow." },
    { type: "paragraph", text: "Businesses evolve." },
    { type: "paragraph", text: "Markets move." },
    { type: "paragraph", text: "Tax rules change." },
    { type: "paragraph", text: "Retirement gets closer." },
    { type: "paragraph", text: "Priorities shift." },
    {
      type: "paragraph",
      text: "A strategy that made sense five years ago may not be the right strategy today.",
    },
    {
      type: "paragraph",
      text: "That is one reason the advisor relationship matters.",
    },
    { type: "paragraph", text: "A financial plan should evolve with the client." },
    {
      type: "paragraph",
      text: "The goal is not simply to build a portfolio once.",
    },
    {
      type: "paragraph",
      text: "It is to continue asking whether the financial structure still supports the life the client is building.",
    },

    { type: "heading", level: 2, text: "The Keybase Perspective" },
    {
      type: "paragraph",
      text: "Good financial planning is not ultimately about accumulating more financial products.",
    },
    { type: "paragraph", text: "It is about creating alignment." },
    { type: "paragraph", text: "Alignment between investments and goals." },
    { type: "paragraph", text: "Between risk and time horizon." },
    { type: "paragraph", text: "Between today's decisions and tomorrow's priorities." },
    {
      type: "paragraph",
      text: "Between financial resources and the life those resources are meant to support.",
    },
    {
      type: "paragraph",
      text: "At Keybase Financial Group, we believe the most useful financial conversations begin with one question:",
    },
    { type: "quote", text: "What are you trying to achieve?" },
    { type: "paragraph", text: "The products come after." },
  ],

  /**
   * The supplied copy closes on "Discover the Keybase Difference". The article
   * template's closing band is the site-wide advisor CTA by deliberate design,
   * so that ask is carried here, where an article states where to read next.
   */
  relatedServices: [
    {
      href: "/about",
      label: "Discover the Keybase Difference",
      note: "How an independent, open-architecture firm approaches advice.",
    },
    {
      href: "/wealth-building",
      label: "Wealth Building",
      note: "Planning built around objectives, time horizons and priorities rather than products.",
    },
  ],
};
