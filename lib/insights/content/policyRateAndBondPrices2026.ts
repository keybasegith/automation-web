import type { InsightArticle } from "../types";

// Dated policy context: Bank of Canada deliberations published September 16.
// Bond mechanics: OSC investor education. No projected returns or product claims.
export const POLICY_RATE_AND_BOND_PRICES_2026: InsightArticle = {
  slug: "policy-rate-and-bond-prices-september-2026",
  kind: "market",
  category: "Market Perspectives",
  eyebrow: "Keybase Market Perspectives",
  title: "An Unchanged Policy Rate Does Not Mean Unchanged Bond Prices",
  deck: "The central bank’s overnight rate and the market value of a bond are different measures. Understanding the distinction helps put rate headlines in context.",
  excerpt: "Why bond prices can move between policy decisions, how interest-rate and credit risks differ, and why an individual bond is not the same as a bond fund.",
  publishedAt: "2026-09-21",
  showDisclaimer: true,
  showAdvisorCta: false,
  keyTakeaways: [
    "A policy-rate announcement does not fix the market price of a bond.",
    "Interest-rate sensitivity and an issuer’s ability to repay are separate risks.",
    "An individual bond’s maturity terms should not be assumed to apply to a bond fund.",
  ],
  body: [
    { type: "paragraph", text: "At its September 2, 2026 decision, the Bank of Canada kept its policy rate at **2.25%**. Its deliberations, published September 16, also described an increase in Canadian bond yields since the July Monetary Policy Report. These observations illustrate why an unchanged policy setting should not be read as an unchanged bond market. [1]" },
    { type: "heading", level: 2, text: "Different rates describe different things" },
    { type: "paragraph", text: "A conventional fixed-rate bond promises specified payments under its terms. Its market price can change before maturity. In general, when comparable market yields rise, an existing fixed-rate bond’s price falls; when those yields fall, its price rises, all else equal. This describes a pricing relationship, not a forecast. [2]" },
    { type: "paragraph", text: "The Bank’s September deliberations linked higher long-term yields to concerns about sovereign debt and expectations about monetary policy. That was the Bank’s account of conditions ahead of its decision, not a commitment about future rates. [1]" },
    { type: "heading", level: 2, text: "Interest-rate risk is only one part of the picture" },
    { type: "paragraph", text: "Duration measures sensitivity to changes in yields. Greater duration generally means larger price changes for a given yield movement, all else equal. Credit risk is different: an issuer may fail to make interest payments or repay principal. A higher yield can reflect greater risk and is not, by itself, evidence of a better investment. [2]" },
    { type: "heading", level: 2, text: "A bond and a bond fund are not interchangeable" },
    { type: "paragraph", text: "For a conventional individual bond, repayment at maturity is based on its face value and contractual terms, and depends on the issuer meeting its obligations. That face value need not equal the price an investor paid. Selling earlier can result in a loss. [3]" },
    { type: "paragraph", text: "A conventional ongoing bond mutual fund or ETF holds a portfolio whose value and income can change. It generally does not have a single maturity date at which investors are promised their original investment back. Product structures differ; the prospectus explains a particular fund’s approach and risks. [3]" },
    { type: "heading", level: 2, text: "Reading the next rate headline" },
    { type: "paragraph", text: "Our interpretation is that a rate headline is a starting point for understanding an investment, not a substitute for examining it. Distinguish the policy announcement from market yields, identify the instrument being discussed, and check the risks and repayment terms before drawing conclusions." },
    { type: "paragraph", text: "This article makes no prediction about the next rate decision or future bond returns. Source information was checked on September 21, 2026; the policy context refers specifically to the September 2 decision and September 16 deliberations." },
  ],
  sources: [
    { label: "[1] Bank of Canada", title: "Summary of Governing Council deliberations: Fixed announcement date of September 2, 2026 — published September 16, 2026", url: "https://www.bankofcanada.ca/2026/09/summary-of-governing-council-deliberations-fixed-announcement-date-of-september-2-2026/" },
    { label: "[2] Ontario Securities Commission — GetSmarterAboutMoney", title: "Factors that affect bond prices and how to monitor them — accessed September 21, 2026", url: "https://www.getsmarteraboutmoney.ca/learning-path/bonds/factors-that-affect-bond-prices-and-how-to-monitor-them/" },
    { label: "[3] Ontario Securities Commission — GetSmarterAboutMoney", title: "How bonds work — accessed September 21, 2026", url: "https://www.getsmarteraboutmoney.ca/learning-path/bonds/how-bonds-work/" },
  ],
  relatedSlugs: ["canada-august-2026-inflation-reading-the-details"],
  additionalDisclosure: "Bond prices, income and repayment outcomes depend on the instrument and issuer. This discussion is not a recommendation to purchase or sell bonds or bond funds, and does not imply that Keybase offers every product described.",
};
