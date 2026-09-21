import type { InsightArticle } from "../types";

// Figures checked against Statistics Canada's September 14 release on 2026-09-21.
// No named author/reviewer is asserted; editorial screening is not formal sign-off.
export const CANADA_INFLATION_AUGUST_2026: InsightArticle = {
  slug: "canada-august-2026-inflation-reading-the-details",
  kind: "market",
  category: "Market Perspectives",
  eyebrow: "Keybase Market Perspectives",
  title: "Canada’s August Inflation: Reading Beyond the Headline",
  deck: "An unchanged annual inflation rate can conceal different movements across prices and time periods.",
  excerpt: "A closer look at Canada’s August CPI release: annual versus monthly changes, household spending differences, and the limits of a single economic indicator.",
  publishedAt: "2026-09-21",
  showDisclaimer: true,
  showAdvisorCta: false,
  keyTakeaways: [
    "August’s annual headline inflation rate matched July’s, while the monthly measures moved differently.",
    "A slower pace of price increases does not mean prices have returned to earlier levels.",
    "The national CPI does not describe every household’s spending experience.",
  ],
  body: [
    { type: "paragraph", text: "Statistics Canada’s September 14 release reported that Canada’s Consumer Price Index rose **3.0% year over year in August 2026**, unchanged from July. That is a comparison with August a year earlier, not the change during August alone. [1]" },
    { type: "heading", level: 2, text: "The comparison period matters" },
    { type: "paragraph", text: "Month over month, the CPI declined **0.1%** before seasonal adjustment and increased **0.2%** after seasonal adjustment. Those measures answer different questions and should not be presented interchangeably. [1]" },
    { type: "paragraph", text: "Seasonal adjustment helps account for recurring patterns in prices. When comparing releases, use the same measure and time period; switching between annual and monthly changes can create an impression the data do not support. [2]" },
    { type: "heading", level: 2, text: "An unchanged headline can hide different pressures" },
    { type: "paragraph", text: "The release showed that CPI excluding gasoline rose **2.4% year over year**, compared with **2.2%** in July. Grocery prices increased **2.8% year over year**, a slower rise than July’s **3.1%**. Slower grocery inflation still means prices were higher than a year earlier. [1]" },
    { type: "paragraph", text: "CPI excluding gasoline should not be relabelled as CPI-trim or CPI-median. Statistics Canada defines those core measures using different methods to filter price movements. Removing one category is a different calculation. [2]" },
    { type: "heading", level: 2, text: "National inflation and household budgets" },
    { type: "paragraph", text: "The CPI combines prices using expenditure weights intended to represent Canadian consumer spending. A household that spends a different share on rent, transportation or groceries can experience a different change in its expenses. The national rate is a reference point, not a precise adjustment for every personal budget. [2]" },
    { type: "heading", level: 2, text: "What this report does not establish" },
    { type: "paragraph", text: "Our interpretation is that the August release calls for careful comparison, rather than a trading conclusion. It describes observed price changes; it does not establish the return an investment will earn or the direction of the next interest-rate decision." },
    { type: "paragraph", text: "A useful reading process is to identify the period being compared, check whether figures are seasonally adjusted, and separate the reported data from any forecast attached to them. None of the figures above is a forecast of future inflation or investment performance." },
    { type: "paragraph", text: "Source information checked on September 21, 2026. The economic data discussed cover August 2026." },
  ],
  sources: [
    { label: "[1] Statistics Canada", title: "Consumer Price Index, August 2026 — released September 14, 2026", url: "https://www150.statcan.gc.ca/n1/daily-quotidien/260914/dq260914a-eng.htm" },
    { label: "[2] Statistics Canada", title: "Consumer Price Index: Frequently asked questions — accessed September 21, 2026", url: "https://www.statcan.gc.ca/en/subjects-start/prices_and_price_indexes/consumer_price_indexes/faq" },
  ],
  relatedSlugs: ["policy-rate-and-bond-prices-september-2026"],
  additionalDisclosure: "This article discusses published economic data for general information. It does not recommend any security, product or transaction, or predict monetary-policy decisions.",
};
