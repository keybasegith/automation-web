import type { InsightArticle } from "../types";

/**
 * Perspectives — why a financial plan is more than an investment portfolio.
 *
 * Firm voice: no figures and no sources, so nothing here is date-sensitive.
 * `showDisclaimer` is set explicitly for the same reason as the rest of the
 * Perspectives run — "company-news" would otherwise suppress it.
 */
export const PLAN_BIGGER_THAN_PORTFOLIO: InsightArticle = {
  slug: "financial-plan-bigger-than-your-portfolio",
  kind: "company-news",
  category: "Perspectives",
  eyebrow: "Keybase Perspectives",
  title: "Why Your Financial Plan Should Be Bigger Than Your Portfolio",
  deck: "Your investments are important. But they are only one part of your financial life.",
  excerpt:
    "A strong portfolio can still exist inside a weak financial plan. We look at the cash flow, risk, tax, insurance and estate considerations that an investment statement never shows.",

  publishedAt: "2026-09-17",

  seoTitle:
    "Why Your Financial Plan Should Be Bigger Than Your Portfolio | Keybase Financial Group",
  seoDescription:
    "Investment performance is only part of the picture. Keybase looks at how cash flow, risk, taxes, insurance and estate planning shape whether a financial strategy actually works.",

  heroImage: {
    src: "/wealth-building21.jpg",
    alt: "Hands reviewing printed reports beneath an overlay of market performance charts",
    width: 6240,
    height: 4160,
  },

  showDisclaimer: true,

  body: [
    {
      type: "paragraph",
      text: "For many people, financial planning begins and ends with the portfolio.",
    },
    { type: "paragraph", text: "How much is invested?" },
    { type: "paragraph", text: "How has it performed?" },
    { type: "paragraph", text: "Which funds are being used?" },
    {
      type: "paragraph",
      text: "What percentage is allocated to stocks or bonds?",
    },
    { type: "paragraph", text: "Those are important questions." },
    { type: "paragraph", text: "But they are not the entire financial picture." },
    {
      type: "paragraph",
      text: "A strong portfolio can still exist inside a weak financial plan.",
    },
    {
      type: "paragraph",
      text: "At Keybase Financial Group, we believe wealth management should look beyond investment performance and consider how the different parts of a client's financial life work together.",
    },

    { type: "heading", level: 2, text: "Your portfolio has a purpose" },
    { type: "paragraph", text: "A portfolio is not an end in itself." },
    { type: "paragraph", text: "It exists to help support something." },
    { type: "paragraph", text: "Retirement." },
    { type: "paragraph", text: "Financial independence." },
    { type: "paragraph", text: "A business transition." },
    { type: "paragraph", text: "A future home." },
    { type: "paragraph", text: "Education." },
    { type: "paragraph", text: "Family security." },
    { type: "paragraph", text: "Intergenerational wealth." },
    { type: "paragraph", text: "A legacy." },
    {
      type: "paragraph",
      text: "The appropriate investment strategy depends on what the money is ultimately expected to do.",
    },
    {
      type: "paragraph",
      text: "Two clients with the same account balance can require very different strategies because their objectives, timelines, income needs and tolerance for risk may be completely different.",
    },
    {
      type: "paragraph",
      text: "That is why portfolio construction should begin with planning.",
    },

    { type: "heading", level: 2, text: "Cash flow matters" },
    {
      type: "paragraph",
      text: "Investment returns receive a great deal of attention.",
    },
    {
      type: "paragraph",
      text: "But long-term financial outcomes are also shaped by cash flow.",
    },
    { type: "paragraph", text: "How much is being saved?" },
    { type: "paragraph", text: "How much liquidity is required?" },
    { type: "paragraph", text: "Are there major upcoming expenses?" },
    { type: "paragraph", text: "Is debt structured appropriately?" },
    {
      type: "paragraph",
      text: "Could an unexpected event force investments to be sold at the wrong time?",
    },
    {
      type: "paragraph",
      text: "These questions may not appear on an investment statement, but they can have a major effect on whether a financial strategy actually works.",
    },

    {
      type: "heading",
      level: 2,
      text: "Risk is broader than market volatility",
    },
    {
      type: "paragraph",
      text: "When people hear the word “risk,” they often think about stock-market losses.",
    },
    { type: "paragraph", text: "But financial risk takes many forms." },
    {
      type: "paragraph",
      text: "There is longevity risk — the possibility of outliving financial resources.",
    },
    {
      type: "paragraph",
      text: "Liquidity risk — needing cash at an inconvenient time.",
    },
    {
      type: "paragraph",
      text: "Concentration risk — having too much wealth tied to one company, sector or asset.",
    },
    { type: "paragraph", text: "Business risk." },
    { type: "paragraph", text: "Insurance risk." },
    { type: "paragraph", text: "Inflation risk." },
    { type: "paragraph", text: "Tax risk." },
    { type: "paragraph", text: "Estate-planning risk." },
    {
      type: "paragraph",
      text: "A portfolio should be designed with these broader realities in mind.",
    },
    {
      type: "paragraph",
      text: "The most appropriate strategy is not always the portfolio with the highest expected return.",
    },
    {
      type: "paragraph",
      text: "It is the strategy that best fits the role the money needs to play.",
    },

    { type: "heading", level: 2, text: "Taxes can change the outcome" },
    {
      type: "paragraph",
      text: "Investment performance does not happen in a vacuum.",
    },
    {
      type: "paragraph",
      text: "Where assets are held, when income is realized, how withdrawals are structured and how different forms of investment income are treated can all affect the amount of wealth a client ultimately keeps.",
    },
    {
      type: "paragraph",
      text: "That does not mean investment decisions should be driven by taxes alone.",
    },
    {
      type: "paragraph",
      text: "But tax considerations should be integrated into the broader planning process where appropriate.",
    },
    {
      type: "paragraph",
      text: "The same is true for retirement income, business ownership and estate planning.",
    },
    {
      type: "paragraph",
      text: "Financial decisions become more powerful when they are coordinated.",
    },

    {
      type: "heading",
      level: 2,
      text: "Insurance is part of the financial structure",
    },
    {
      type: "paragraph",
      text: "Insurance is sometimes treated as separate from wealth management.",
    },
    {
      type: "paragraph",
      text: "In reality, it can be an important part of protecting the plan.",
    },
    {
      type: "paragraph",
      text: "A financial strategy may assume years of future income, continued business ownership or ongoing contributions to retirement savings.",
    },
    {
      type: "paragraph",
      text: "Unexpected events can change those assumptions quickly.",
    },
    {
      type: "paragraph",
      text: "Insurance can help protect against risks that an investment portfolio was never designed to absorb on its own.",
    },
    {
      type: "paragraph",
      text: "The question is not simply whether a client owns insurance.",
    },
    {
      type: "paragraph",
      text: "The question is whether the coverage fits the overall financial strategy.",
    },

    {
      type: "heading",
      level: 2,
      text: "Estate planning matters before the estate exists",
    },
    {
      type: "paragraph",
      text: "Estate planning is often postponed because it feels like a distant concern.",
    },
    {
      type: "paragraph",
      text: "But many estate decisions are really planning decisions for today.",
    },
    { type: "paragraph", text: "How should assets be structured?" },
    { type: "paragraph", text: "Who should receive them?" },
    { type: "paragraph", text: "How should family members be protected?" },
    { type: "paragraph", text: "What happens to a privately owned business?" },
    {
      type: "paragraph",
      text: "Are beneficiary designations consistent with the broader plan?",
    },
    {
      type: "paragraph",
      text: "Is liquidity available if taxes or other obligations arise?",
    },
    {
      type: "paragraph",
      text: "These decisions affect more than what happens at the end of life.",
    },
    {
      type: "paragraph",
      text: "They can influence how wealth is structured for decades.",
    },

    { type: "heading", level: 2, text: "The value of seeing the whole picture" },
    { type: "paragraph", text: "The financial world is divided into categories." },
    { type: "paragraph", text: "Investments." },
    { type: "paragraph", text: "Insurance." },
    { type: "paragraph", text: "Retirement." },
    { type: "paragraph", text: "Taxes." },
    { type: "paragraph", text: "Estate planning." },
    { type: "paragraph", text: "Business planning." },
    { type: "paragraph", text: "But the client only has one financial life." },
    {
      type: "paragraph",
      text: "That is why advice should connect the categories rather than treat them as isolated decisions.",
    },
    {
      type: "paragraph",
      text: "At Keybase, we believe an advisor's role is to help bring those pieces together.",
    },

    { type: "heading", level: 2, text: "The Keybase Perspective" },
    {
      type: "paragraph",
      text: "A portfolio is one of the most important tools in financial planning.",
    },
    { type: "paragraph", text: "But it is still a tool." },
    {
      type: "paragraph",
      text: "The real objective is to create a financial structure that supports the client's life, protects against meaningful risks and adapts as circumstances change.",
    },
    {
      type: "paragraph",
      text: "That requires looking beyond investment performance.",
    },
    {
      type: "paragraph",
      text: "It means understanding cash flow, risk, taxes, insurance, retirement, family priorities, estate objectives and the purpose behind the wealth itself.",
    },
    {
      type: "callout",
      text: "**Your portfolio should fit inside your financial plan — not become your financial plan.**",
    },
  ],

  /** The supplied "Explore Wealth Planning" ask, carried as a read-next link. */
  relatedServices: [
    {
      href: "/wealth-building",
      label: "Explore Wealth Planning",
      note: "Planning that considers cash flow, risk, taxes and estate objectives alongside the portfolio.",
    },
    {
      href: "/traditional-investments",
      label: "Traditional Investments",
      note: "How portfolios are built around the role the money needs to play.",
    },
  ],
};
