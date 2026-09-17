import type { InsightArticle } from "../types";

/**
 * Market Perspectives — Canada's August 2026 Labour Force Survey.
 *
 * Every figure below comes from the Statistics Canada and Bank of Canada
 * releases listed in `sources`; nothing here is inferred or projected.
 *
 * Two sources carry URLs and two do not. The Labour Force Survey release and
 * the September rate announcement were both checked against the live pages
 * before being linked; the LFS data tables and the July Monetary Policy Report
 * are cited as text rather than pointed at a guessed permalink.
 *
 * `authorId` is unset, as on the other two Market Perspectives pieces — the
 * supplied copy carried no byline, and the byline component prints a date
 * rather than attributing the article to someone who did not write it.
 */
export const CANADA_JOBS_AUGUST_2026: InsightArticle = {
  slug: "canada-jobs-august-2026-labour-market-investor-perspective",
  kind: "market",
  category: "Market Perspectives",
  eyebrow: "Keybase Market Perspectives",
  title:
    "Canada Lost 42,000 Jobs in August. What Does the Labour Market Actually Tell Us?",
  deck: "Employment declined, unemployment held steady, and wage growth slowed. The combination tells us more than any one number on its own.",
  excerpt:
    "Canadian employment fell by 42,000 in August while unemployment held at 6.4% and wage growth slowed. We look beyond the headline at what the latest labour data may tell us about the Canadian economy and investors.",

  publishedAt: "2026-09-08",

  seoTitle:
    "Canada Lost 42,000 Jobs in August: What Investors Should Watch | Keybase Financial Group",
  seoDescription:
    "Canadian employment fell 42,000 in August 2026 while unemployment held at 6.4% and wage growth slowed to 2.0%. Keybase looks at what the labour data mean for the economy and investors.",

  heroImage: {
    src: "/newsroom3.jpg",
    alt: "Illustration of Canadian workers, employment statistics and the Toronto skyline representing Canada's August 2026 labour-market report",
    width: 1672,
    height: 941,
  },

  /**
   * Both directions are curated: the September rate decision is the policy half
   * of this story, and the July CPI piece is the inflation half. The rate-hold
   * article links back here in turn.
   */
  relatedSlugs: [
    "bank-of-canada-september-2026-rate-hold-investor-perspective",
    "canada-inflation-july-2026-investor-perspective",
  ],

  body: [
    {
      type: "paragraph",
      text: "Canada's labour market lost some momentum in August.",
    },
    {
      type: "paragraph",
      text: "Statistics Canada reported that employment declined by **42,000, or 0.2%**, while the national unemployment rate remained unchanged at **6.4%**.",
    },
    {
      type: "paragraph",
      text: "The employment rate — the proportion of Canadians aged 15 and older who are employed — edged down to **60.8%**.",
    },
    {
      type: "paragraph",
      text: "At the same time, average hourly wage growth slowed to **2.0% year over year**, with average hourly wages reaching **$37.02**.",
    },
    {
      type: "paragraph",
      text: "Those numbers may initially appear contradictory.",
    },
    { type: "paragraph", text: "Employment fell." },
    { type: "paragraph", text: "Unemployment did not rise." },
    { type: "paragraph", text: "Manufacturing employment increased." },
    {
      type: "paragraph",
      text: "And total employment was still higher than it had been a year earlier.",
    },
    {
      type: "paragraph",
      text: "That is why one month of labour-market data is better understood as a collection of signals than as a single verdict on the Canadian economy.",
    },

    { type: "heading", level: 2, text: "What happened in August?" },
    {
      type: "paragraph",
      text: "Statistics Canada's August Labour Force Survey reported:",
    },
    {
      type: "list",
      items: [
        "Employment: **-42,000**",
        "Monthly employment change: **-0.2%**",
        "Unemployment rate: **6.4%**",
        "Employment rate: **60.8%**",
        "Average hourly wages: **$37.02**",
        "Year-over-year wage growth: **2.0%**",
      ],
    },
    {
      type: "paragraph",
      text: "The decline came after several months of stronger employment growth.",
    },
    {
      type: "paragraph",
      text: "From April through July, Canadian employment had increased by a cumulative **181,000 jobs**.",
    },
    {
      type: "paragraph",
      text: "Even after the August decline, employment remained **217,000 higher** than it had been one year earlier, representing year-over-year growth of approximately 1.0%.",
    },
    { type: "paragraph", text: "That context matters." },
    {
      type: "paragraph",
      text: "A monthly decline can indicate weaker momentum without necessarily meaning that the broader employment trend has fully reversed.",
    },

    { type: "heading", level: 2, text: "Why did unemployment stay at 6.4%?" },
    {
      type: "paragraph",
      text: "Employment and unemployment are related, but they are not simply opposite versions of the same statistic.",
    },
    {
      type: "paragraph",
      text: "Canada's unemployment rate measures the share of people in the labour force who are unemployed and actively looking for work.",
    },
    {
      type: "paragraph",
      text: "Changes in employment therefore do not always produce an equal change in the unemployment rate.",
    },
    {
      type: "paragraph",
      text: "In August, the national unemployment rate stayed at 6.4%.",
    },
    {
      type: "paragraph",
      text: "There were also meaningful differences across demographic groups.",
    },
    { type: "paragraph", text: "Among workers aged 25 to 54:" },
    {
      type: "list",
      items: [
        "unemployment among men increased to **6.0%**",
        "unemployment among women declined to **5.0%**",
      ],
    },
    {
      type: "paragraph",
      text: "For young Canadians aged 15 to 24, unemployment was **12.9%** and was little changed during the month.",
    },
    {
      type: "paragraph",
      text: "The differences illustrate why a national unemployment rate can conceal considerably different experiences across age groups and segments of the workforce.",
    },

    { type: "heading", level: 2, text: "Wage growth slowed noticeably" },
    {
      type: "paragraph",
      text: "One of the more notable signals in the August report was wage growth.",
    },
    {
      type: "paragraph",
      text: "Average hourly wages among employees increased **2.0% year over year** to $37.02.",
    },
    {
      type: "paragraph",
      text: "That followed year-over-year wage growth of **2.8% in July**.",
    },
    { type: "paragraph", text: "Wage trends matter for several reasons." },
    {
      type: "paragraph",
      text: "For households, wages influence disposable income, saving capacity and consumer spending.",
    },
    {
      type: "paragraph",
      text: "For businesses, labour is one of the most significant operating costs.",
    },
    {
      type: "paragraph",
      text: "And for the Bank of Canada, wage growth can provide information about the balance between labour demand, inflation pressure and productivity.",
    },
    {
      type: "paragraph",
      text: "Persistent wage increases that substantially exceed productivity growth can contribute to sustained cost pressures.",
    },
    {
      type: "paragraph",
      text: "Slower wage growth may therefore be consistent with easing inflation pressure.",
    },
    {
      type: "paragraph",
      text: "At the same time, slower income growth can also reduce the pace of household spending.",
    },
    {
      type: "paragraph",
      text: "The economic implications depend on what is happening simultaneously to inflation, employment, productivity and consumer demand.",
    },

    {
      type: "heading",
      level: 2,
      text: "The weakness was not evenly distributed",
    },
    {
      type: "paragraph",
      text: "August's employment decline was concentrated in several industries.",
    },
    { type: "paragraph", text: "Employment decreased in:" },
    {
      type: "list",
      items: [
        "Business, building and other support services: **-20,000**",
        "Public administration: **-8,800**",
        "Natural resources: **-7,700**",
        "Utilities: **-5,600**",
      ],
    },
    { type: "paragraph", text: "Manufacturing moved in the opposite direction." },
    {
      type: "paragraph",
      text: "Employment in manufacturing increased by **22,000, or 1.2%**, during the month.",
    },
    {
      type: "paragraph",
      text: "That makes the composition of the employment report particularly important.",
    },
    {
      type: "paragraph",
      text: "A national jobs number can move lower even while some industries continue hiring.",
    },
    {
      type: "paragraph",
      text: "Different sectors respond differently to consumer demand, interest rates, government spending, commodity prices, international trade and business investment.",
    },
    {
      type: "paragraph",
      text: "For investors, looking beneath the headline can therefore provide more useful context than the total employment number alone.",
    },

    { type: "heading", level: 2, text: "What happened in Ontario?" },
    {
      type: "paragraph",
      text: "Ontario employment edged down by **18,000, or 0.2%**, in August.",
    },
    {
      type: "paragraph",
      text: "The monthly decline followed a period of stronger job creation in the province.",
    },
    {
      type: "paragraph",
      text: "From March through July, Ontario had added a net **119,000 jobs**.",
    },
    {
      type: "paragraph",
      text: "Employment in the province was still **116,000 higher** than it had been one year earlier.",
    },
    {
      type: "paragraph",
      text: "Ontario's unemployment rate was **6.9%** in August.",
    },
    {
      type: "paragraph",
      text: "The provincial picture therefore resembles the national one in an important way: short-term momentum softened, but the year-over-year picture remained stronger than the monthly headline alone might suggest.",
    },
    {
      type: "paragraph",
      text: "Regional labour-market conditions can matter to investors and financial planners because employment ultimately affects household income, consumer activity, borrowing demand and housing-market conditions.",
    },

    {
      type: "heading",
      level: 2,
      text: "What does the labour market tell us about the economy?",
    },
    {
      type: "paragraph",
      text: "The labour market is one of the clearest ways economic conditions reach individual households.",
    },
    {
      type: "paragraph",
      text: "But it is also a lagging and sometimes noisy economic indicator.",
    },
    {
      type: "paragraph",
      text: "Companies do not necessarily hire immediately when demand improves.",
    },
    {
      type: "paragraph",
      text: "They also do not always reduce staff immediately when economic activity slows.",
    },
    {
      type: "paragraph",
      text: "Employment decisions can therefore reflect business conditions that have developed over a longer period.",
    },
    {
      type: "paragraph",
      text: "August's report suggests a Canadian labour market that remains softer than during the post-pandemic period but is not moving uniformly in one direction.",
    },
    { type: "paragraph", text: "Employment fell during the month." },
    { type: "paragraph", text: "Wage growth moderated." },
    { type: "paragraph", text: "Youth unemployment remained elevated." },
    {
      type: "paragraph",
      text: "But the national unemployment rate did not increase, manufacturing added jobs, and total employment remained higher than a year earlier.",
    },
    {
      type: "paragraph",
      text: "For policymakers and investors, the trend over several months is generally more informative than any single Labour Force Survey.",
    },

    {
      type: "heading",
      level: 2,
      text: "What could this mean for interest rates?",
    },
    {
      type: "paragraph",
      text: "Labour-market conditions are one of many inputs the Bank of Canada considers when setting monetary policy.",
    },
    {
      type: "paragraph",
      text: "A weakening labour market can indicate that demand in the economy is slowing.",
    },
    {
      type: "paragraph",
      text: "All else equal, weaker demand can reduce inflation pressure.",
    },
    {
      type: "paragraph",
      text: "But labour-market data are not considered in isolation.",
    },
    { type: "paragraph", text: "The Bank also assesses:" },
    {
      type: "list",
      items: [
        "headline inflation",
        "underlying inflation measures",
        "consumer spending",
        "business investment",
        "productivity",
        "GDP growth",
        "housing activity",
        "inflation expectations",
        "energy prices",
        "global economic conditions",
        "international trade developments",
      ],
    },
    {
      type: "paragraph",
      text: "That distinction is especially relevant in the current environment.",
    },
    {
      type: "paragraph",
      text: "On September 2, the Bank of Canada maintained its policy rate at **2.25%**.",
    },
    {
      type: "paragraph",
      text: "The Bank said recent growth and inflation data had evolved broadly in line with its July outlook while risks surrounding energy prices and trade had increased.",
    },
    {
      type: "paragraph",
      text: "A softer labour report therefore becomes another piece of evidence for policymakers to consider — not an automatic signal of what the next interest-rate decision will be.",
    },

    {
      type: "heading",
      level: 2,
      text: "What should investors pay attention to?",
    },
    {
      type: "paragraph",
      text: "Rather than focusing only on the headline monthly employment change, several indicators may provide a clearer picture of the direction of the Canadian labour market.",
    },

    { type: "heading", level: 3, text: "1. The unemployment rate" },
    {
      type: "paragraph",
      text: "At 6.4%, the national unemployment rate remains an important measure of available labour-market capacity.",
    },
    {
      type: "paragraph",
      text: "A sustained move higher or lower over several months can provide information about whether labour demand is weakening or strengthening.",
    },

    { type: "heading", level: 3, text: "2. Wage growth" },
    {
      type: "paragraph",
      text: "The slowdown to 2.0% year over year is worth watching.",
    },
    {
      type: "paragraph",
      text: "Future reports will help indicate whether the moderation is temporary or part of a broader trend toward slower wage pressure.",
    },

    { type: "heading", level: 3, text: "3. Employment growth" },
    {
      type: "paragraph",
      text: "One monthly loss should be viewed in the context of previous gains.",
    },
    {
      type: "paragraph",
      text: "Canada added a cumulative 181,000 jobs from April through July before August's decline.",
    },
    {
      type: "paragraph",
      text: "The persistence of gains or losses matters more than one isolated month.",
    },

    { type: "heading", level: 3, text: "4. Hours worked" },
    {
      type: "paragraph",
      text: "Employers can adjust employee hours before making larger changes to staffing.",
    },
    {
      type: "paragraph",
      text: "Changes in hours worked can therefore provide additional context around the strength of labour demand.",
    },

    { type: "heading", level: 3, text: "5. Industry differences" },
    {
      type: "paragraph",
      text: "National employment data can hide considerable divergence.",
    },
    {
      type: "paragraph",
      text: "Manufacturing added 22,000 positions in August even as employment declined in several other industries.",
    },
    {
      type: "paragraph",
      text: "Sector-level trends may provide more useful information for understanding particular businesses and investment exposures.",
    },

    { type: "heading", level: 3, text: "6. Consumer activity" },
    {
      type: "paragraph",
      text: "Employment and wages influence the amount households can spend, save and invest.",
    },
    {
      type: "paragraph",
      text: "A sustained slowdown in labour income can eventually affect consumer-facing companies and broader economic activity.",
    },

    {
      type: "heading",
      level: 2,
      text: "What does this mean for a long-term portfolio?",
    },
    {
      type: "paragraph",
      text: "Monthly labour-market releases can influence expectations for economic growth and interest rates.",
    },
    {
      type: "paragraph",
      text: "Those changing expectations can affect bond yields, equity valuations and currencies.",
    },
    {
      type: "paragraph",
      text: "But a long-term investment plan generally needs to operate through periods of both strong and weak employment growth.",
    },
    {
      type: "paragraph",
      text: "Different assets may respond differently when economic conditions soften.",
    },
    {
      type: "paragraph",
      text: "Government bonds can react to changing expectations for inflation and monetary policy.",
    },
    {
      type: "paragraph",
      text: "Corporate credit can become more sensitive to business conditions.",
    },
    {
      type: "paragraph",
      text: "Equity sectors can experience very different earnings outcomes.",
    },
    {
      type: "paragraph",
      text: "Cash can provide stability and liquidity, but remaining excessively defensive for long periods can create different risks for investors whose objectives require long-term growth.",
    },
    { type: "paragraph", text: "This is one reason diversification matters." },
    {
      type: "paragraph",
      text: "The objective is generally not to reposition an entire portfolio around the next employment report.",
    },
    {
      type: "paragraph",
      text: "It is to build a portfolio whose risk, expected return and liquidity remain appropriate for the investor's objectives across a range of economic environments.",
    },

    { type: "heading", level: 2, text: "The Keybase Perspective" },
    {
      type: "paragraph",
      text: "Canada's August employment report deserves attention, but the headline loss of 42,000 jobs does not tell the entire story.",
    },
    {
      type: "paragraph",
      text: "Employment declined after several months of gains.",
    },
    { type: "paragraph", text: "The unemployment rate remained at 6.4%." },
    { type: "paragraph", text: "Wage growth slowed to 2.0%." },
    {
      type: "paragraph",
      text: "Manufacturing added jobs even as several other industries contracted.",
    },
    {
      type: "paragraph",
      text: "And total employment remained higher than it was a year earlier.",
    },
    {
      type: "paragraph",
      text: "Together, the data point to a labour market that continues to show areas of softness and lost some recent momentum in August.",
    },
    {
      type: "paragraph",
      text: "The more useful question is whether those trends persist.",
    },
    {
      type: "paragraph",
      text: "Over the coming months, employment growth, wage trends, hours worked, consumer activity and the interaction between labour-market conditions and inflation will help provide a clearer picture of Canada's economic direction.",
    },
    {
      type: "paragraph",
      text: "For long-term investors, the broader lesson is straightforward:",
    },
    {
      type: "callout",
      text: "Watch the trend rather than one data point, understand what is driving the headline, and keep short-term economic developments in the context of a long-term financial plan.",
    },
    {
      type: "paragraph",
      text: "Data and information are current as of September 8, 2026.",
    },
  ],

  sources: [
    {
      label: "Statistics Canada",
      title: "Labour Force Survey, August 2026 (released September 4, 2026)",
      url: "https://www150.statcan.gc.ca/n1/daily-quotidien/260904/dq260904a-eng.htm",
    },
    {
      label: "Statistics Canada",
      title: "Labour Force Survey data tables, including table 14-10-0287-01",
    },
    {
      label: "Bank of Canada",
      title: "Bank of Canada maintains the policy rate at 2¼%, September 2, 2026",
      url: "https://www.bankofcanada.ca/2026/09/fad-press-release-2026-09-02/",
    },
    { label: "Bank of Canada", title: "Monetary Policy Report — July 2026" },
  ],

  relatedServices: [
    {
      href: "/traditional-investments",
      label: "Traditional Investments",
      note: "Diversified investment strategies built around long-term objectives rather than individual economic releases.",
    },
    {
      href: "/wealth-building",
      label: "Wealth Building",
      note: "Financial planning designed around your goals, time horizon and changing economic circumstances.",
    },
  ],
};
