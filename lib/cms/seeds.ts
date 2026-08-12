import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import type {
  CareersContent,
  ContentPagesContent,
  ExecutiveItem,
  ExecutivesContent,
  FooterContent,
  GlobalSettings,
  NavContent,
  NewsroomContent,
  ServicePageContent,
  ServicePagesContent,
} from "@/lib/cms/types";

/** Deterministic id for seed items (kept stable across seeds via the slug). */
function seedId(prefix: string, key: string): string {
  return `${prefix}-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

/**
 * Seed content = the site's current hardcoded values, captured verbatim from
 * components/home/SiteHeader.tsx, components/home/SiteFooter.tsx, and the
 * original key-executives page. On first run the CMS store writes these as both
 * the draft and the published copy, so the live site looks identical before any
 * editing. After that, the admin owns the content.
 */

export function seedGlobalSettings(): GlobalSettings {
  return {
    companyName: "Keybase Financial Group",
    logoUrl: "/keybase-logo-nobg.png",
    logoAlt: "Keybase Financial Group",
    address: "",
    phone: "+1 905-709-7911",
    generalEmail: "info@keybase.com",
    supportEmail: "complaint@keybase.com",
    socialLinks: [
      { platform: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/company/keybase" },
      { platform: "x", label: "X", url: "https://x.com" },
      { platform: "instagram", label: "Instagram", url: "https://instagram.com" },
      { platform: "youtube", label: "YouTube", url: "https://youtube.com" },
    ],
    copyrightText: "© {year} Keybase Financial Group. All rights reserved.",
    footerDescription:
      "Keybase Financial Group provides wealth management, investment advisory, and financial planning services. Investments are subject to market risk, including the possible loss of principal. Past performance is not a guarantee of future results. This website is for informational purposes only and does not constitute an offer or solicitation in any jurisdiction.",
    defaultSeoTitle: "Keybase Financial Group",
    defaultSeoDescription:
      "Keybase Financial Group provides wealth management, investment advisory, and financial planning services.",
    defaultSocialImage: "/keybase-logo-nobg.png",
    headerAnnouncement: "Are you ready to grow your business?",
    headerAnnouncementUrl: "/become-an-advisor",
    primaryCtaLabel: "Contact Us",
    primaryCtaUrl: "/contact",
  };
}

export function seedFooter(): FooterContent {
  return {
    columns: [
      {
        heading: "What We Do",
        links: [
          { label: "Wealth Management", url: "/wealth-building", openInNewTab: false },
          { label: "Investment Advisory", url: "/traditional-investments", openInNewTab: false },
          { label: "Retirement & Estate", url: "/retirement-planning", openInNewTab: false },
          { label: "Insurance Solutions", url: "/insurance", openInNewTab: false },
        ],
      },
      {
        heading: "Our Firm",
        links: [
          { label: "About Keybase", url: "/about", openInNewTab: false },
          { label: "Our Approach", url: "/ceo-message", openInNewTab: false },
          { label: "Leadership", url: "/key-executives", openInNewTab: false },
          { label: "Insights", url: "/newsroom", openInNewTab: false },
        ],
      },
      {
        heading: "Connect",
        links: [
          { label: "Contact Us", url: "/contact", openInNewTab: false },
          { label: "Careers", url: "/careers", openInNewTab: false },
          { label: "Book a Meeting", url: "/contact", openInNewTab: false },
          { label: "Insights", url: "/newsroom", openInNewTab: false },
        ],
      },
    ],
    legalLinks: [
      { label: "Terms of Use", url: "#", openInNewTab: false },
      { label: "Disclosures", url: "#", openInNewTab: false },
    ],
  };
}

export function seedNavigation(): NavContent {
  return {
    items: [
      {
        label: "Company",
        url: "",
        openInNewTab: false,
        isVisible: true,
        isServicesMega: false,
        children: [
          { label: "About Us", url: "/about", openInNewTab: false, isVisible: true },
          { label: "CEO Message", url: "/ceo-message", openInNewTab: false, isVisible: true },
        ],
      },
      {
        label: "Our Team",
        url: "",
        openInNewTab: false,
        isVisible: true,
        isServicesMega: false,
        children: [
          { label: "Key Executives", url: "/key-executives", openInNewTab: false, isVisible: true },
          { label: "Our Advisors", url: "/our-advisors", openInNewTab: false, isVisible: true },
        ],
      },
      {
        label: "Our Services",
        url: "",
        openInNewTab: false,
        isVisible: true,
        isServicesMega: true,
        children: [],
      },
      {
        label: "Newsroom",
        url: "/newsroom",
        openInNewTab: false,
        isVisible: true,
        isServicesMega: false,
        children: [],
      },
      {
        label: "Careers",
        url: "/careers",
        openInNewTab: false,
        isVisible: true,
        isServicesMega: false,
        children: [],
      },
    ],
    utilityLinks: [
      { label: "Client Access", url: "https://winvestor.keybase.com", openInNewTab: true, isVisible: true },
      { label: "Advisor Access", url: "https://www.keyweb.ca", openInNewTab: true, isVisible: true },
    ],
  };
}

/**
 * Legacy shape written by the original file-backed executives store
 * (lib/admin/executivesRepo.ts, data/executives.json). We migrate it into the
 * CMS on first read so any edits made before the CMS upgrade are preserved.
 */
interface LegacyExecutiveRow {
  id?: string;
  name?: string;
  title?: string;
  lead?: string;
  paragraphs?: string[];
  photo_url?: string | null;
  photo_class?: string | null;
  coming_soon?: boolean;
  ceo_message?: boolean;
  href?: string | null;
  sort_order?: number;
  is_published?: boolean;
}

function migrateLegacyExecutives(): ExecutiveItem[] | null {
  try {
    const file = path.join(process.cwd(), "data", "executives.json");
    const rows = JSON.parse(readFileSync(file, "utf8")) as LegacyExecutiveRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return [...rows]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .filter((r) => r.name && r.title)
      .map((r) => ({
        id: r.id ?? randomUUID(),
        name: r.name!,
        title: r.title!,
        lead: r.lead ?? "",
        paragraphs: r.paragraphs ?? [],
        photoUrl: r.photo_url ?? null,
        photoClass: r.photo_class ?? null,
        comingSoon: r.coming_soon ?? false,
        ceoMessage: r.ceo_message ?? false,
        href: r.href ?? null,
        isVisible: r.is_published ?? true,
      }));
  } catch {
    return null; // no legacy file → use the built-in seed below
  }
}

export function seedExecutives(): ExecutivesContent {
  const migrated = migrateLegacyExecutives();
  if (migrated) return { people: migrated };

  const base = [
    {
      name: "Dax Sukhraj",
      title: "President & CEO",
      photoUrl: "/dax-profile-updated.jpg",
      ceoMessage: true,
      lead: "Dax Sukhraj is President & CEO at Keybase Financial Group.",
      paragraphs: [
        "As President & CEO, Mr. Sukhraj sets the strategic direction of the firm, championing an independent, client-first model built on transparency and disciplined advice.",
        "Prior to leading Keybase, he held senior roles across wealth management and capital markets, advising individuals, families, and institutions through every stage of the market cycle.",
        "Mr. Sukhraj has more than two decades of experience in the financial services industry and remains personally committed to building durable relationships that span generations.",
      ],
    },
    {
      name: "Linda Yang",
      title: "Vice President, Chief Financial Officer",
      comingSoon: true,
      lead: "Linda Yang is Vice President and Chief Financial Officer at Keybase Financial Group.",
      paragraphs: [
        "Ms. Yang oversees the firm's financial management, reporting, and capital planning, ensuring a strong and disciplined financial foundation.",
        "She brings extensive experience in finance and corporate strategy across the financial services industry, with a focus on stability, transparency, and responsible growth.",
        "Ms. Yang is dedicated to maintaining the financial integrity that underpins the trust clients and advisors place in Keybase.",
      ],
    },
    {
      name: "Keith Sutherland",
      title: "Vice President, System Development and Support",
      photoUrl: "/keith-profile2.jpg",
      lead: "Keith Sutherland is Vice President, System Development and Support at Keybase Financial Group.",
      paragraphs: [
        "Mr. Sutherland leads the firm's technology systems, development, and support, building the digital infrastructure that powers a modern advisory experience.",
        "He brings extensive experience in systems development and technical operations across the financial services industry, with a focus on reliability, security, and innovation.",
        "Mr. Sutherland is dedicated to delivering the tools and platforms that help advisors serve clients seamlessly and securely.",
      ],
    },
    {
      name: "Krissy Sukhraj",
      title: "Director of Marketing & Corporate Strategy",
      photoUrl: "/krissy-newprofile.jpg",
      photoClass: "scale-110",
      href: "/businesscard-krissy",
      lead: "Krissy Sukhraj is Director of Marketing & Corporate Strategy at Keybase Financial Group.",
      paragraphs: [
        "Ms. Sukhraj shapes the firm's brand, client experience, and long-term strategic direction, connecting the Keybase story with the families and institutions it serves.",
        "She brings extensive experience across marketing, communications, and corporate strategy, with a focus on building meaningful, lasting client relationships.",
        "Ms. Sukhraj leads the firm's growth initiatives and is dedicated to ensuring the Keybase experience is clear, personal, and consistent at every touchpoint.",
      ],
    },
    {
      name: "Mark Garcia",
      title: "Chief Compliance Officer",
      photoUrl: "/mark-newprofilepic.jpg",
      href: "/businesscard-mark",
      lead: "Mark Garcia is Chief Compliance Officer at Keybase Financial Group.",
      paragraphs: [
        "Mr. Garcia oversees the firm's regulatory, risk, and governance framework, ensuring every client engagement meets the highest standards of integrity and fiduciary care.",
        "He has held senior compliance and risk leadership roles across the financial services industry, building programs that protect clients while enabling responsible growth.",
        "Mr. Garcia is recognized for embedding a culture of accountability and transparency throughout every level of the organization.",
      ],
    },
    {
      name: "Pushpa Shivanthan",
      title: "Vice President, Back Office Administration",
      photoUrl: "/pushpa-profile2.jpg",
      lead: "Pushpa Shivanthan is Vice President, Back Office Administration at Keybase Financial Group.",
      paragraphs: [
        "Mr. Shivanthan leads the firm's back office and administrative operations, ensuring accurate, timely, and seamless support across every client and advisor interaction.",
        "He brings extensive experience in operations and administration across the financial services industry, with a focus on accuracy, efficiency, and reliability.",
        "Mr. Shivanthan is committed to building the disciplined processes and systems that keep the firm running smoothly behind the scenes.",
      ],
    },
    {
      name: "Jerome Pare",
      title: "Senior I.T. Specialist",
      photoUrl: "/jerome-profile.jpg",
      lead: "Jerome Pare is Senior I.T. Specialist at Keybase Financial Group.",
      paragraphs: [
        "Mr. Pare supports the firm's information technology systems, ensuring secure, reliable, and responsive infrastructure across the organization.",
        "He brings hands-on experience across IT operations, security, and support within the financial services industry.",
        "Mr. Pare is dedicated to keeping the firm's technology running smoothly so advisors and staff can focus on serving clients.",
      ],
    },
  ];

  return {
    people: base.map((b) => ({
      id: randomUUID(),
      name: b.name,
      title: b.title,
      lead: b.lead ?? "",
      paragraphs: b.paragraphs ?? [],
      photoUrl: b.photoUrl ?? null,
      photoClass: b.photoClass ?? null,
      comingSoon: b.comingSoon ?? false,
      ceoMessage: b.ceoMessage ?? false,
      href: b.href ?? null,
      isVisible: true,
    })),
  };
}

// ---------------------------------------------------------------------------
// Service pages — hero + SEO for each public "Our Services" page, captured
// verbatim from the current page files. The bespoke body of each page stays in
// its own design; only these headline/SEO fields are CMS-editable.
// ---------------------------------------------------------------------------
export function seedServicePages(): ServicePagesContent {
  const pages: ServicePageContent[] = [
    {
      slug: "education-planning",
      group: "Wealth Planning",
      eyebrow: "Wealth Planning",
      breadcrumbLabel: "Education Planning",
      heading: "Give the next generation every advantage.",
      intro:
        "The cost of education keeps climbing. Keybase helps Canadian families start early, take advantage of available government grants, and build a strategy aligned with your goals — so when the tuition bills arrive, you’re ready.",
      heroImage: "/education-planning1.jpg",
      ctaLabel: "Start an Education Plan",
      ctaUrl: "/contact",
      seoTitle: "Education Planning — Keybase Financial Group",
      seoDescription:
        "Education is one of the most meaningful investments a family can make. Keybase advisors help you build an education savings strategy aligned with your family's goals, timeline, and financial priorities — including RESPs, government grants, and TFSAs.",
    },
    {
      slug: "estate-planning",
      group: "Wealth Planning",
      eyebrow: "Wealth Planning",
      breadcrumbLabel: "Estate Planning",
      heading: "Protect what you’ve built. Pass it on with purpose.",
      intro:
        "A thoughtful estate plan brings clarity to one of life’s most important decisions — how your wealth, care, and legacy are handled. Keybase helps you protect your assets and transfer them seamlessly across generations.",
      heroImage: "/estate-planning1.jpg",
      ctaLabel: "Start an Estate Plan",
      ctaUrl: "/contact",
      seoTitle: "Estate Planning — Keybase Financial Group",
      seoDescription:
        "Estate planning is more than preparing a will. Keybase advisors help you protect your assets, reduce unnecessary costs, and ensure your wealth is transferred according to your wishes — with clarity, control, and confidence.",
    },
    {
      slug: "retirement-planning",
      group: "Wealth Planning",
      eyebrow: "Wealth Planning",
      breadcrumbLabel: "Retirement Planning",
      heading: "Retire on your terms, with confidence.",
      intro:
        "Retirement is the reward for a lifetime of work. Keybase helps you turn savings, benefits, and investments into durable, tax-efficient income — so you can step into this next chapter with clarity and confidence.",
      heroImage: "/retirement-planning2.jpg",
      ctaLabel: "Start a Retirement Plan",
      ctaUrl: "/contact",
      seoTitle: "Retirement Planning — Keybase Financial Group",
      seoDescription:
        "Retire on your terms. Keybase advisors help you build durable, tax-efficient retirement income — coordinating savings, government benefits, and investments into a plan designed to last a lifetime.",
    },
    {
      slug: "tax-planning",
      group: "Wealth Planning",
      eyebrow: "Wealth Planning",
      breadcrumbLabel: "Tax Planning",
      heading: "Keep more of what you earn.",
      intro:
        "Tax-efficient investing is a critical part of building and preserving wealth. Keybase helps structure your investments with tax efficiency in mind — so unnecessary taxes never quietly erode your long-term returns.",
      heroImage: "/tax-planning1.jpg",
      ctaLabel: "Start a Tax Plan",
      ctaUrl: "/contact",
      seoTitle: "Tax Planning — Keybase Financial Group",
      seoDescription:
        "Keep more of what you earn. Keybase advisors build tax-efficient investment strategies — aligning your portfolio, income needs, retirement goals, and estate objectives to improve after-tax returns and preserve wealth.",
    },
    {
      slug: "wealth-building",
      group: "Wealth Planning",
      eyebrow: "Wealth Planning",
      breadcrumbLabel: "Wealth Building",
      heading: "Build, grow, and protect your wealth.",
      intro:
        "True wealth planning is more than picking investments. Keybase brings your investments, retirement, tax, and estate strategy together into a single coordinated plan — built around your life and designed to last.",
      heroImage: "/wealth-planning1.jpg",
      ctaLabel: "Start a Wealth Plan",
      ctaUrl: "/contact",
      seoTitle: "Wealth Building — Keybase Financial Group",
      seoDescription:
        "Build, grow, and protect your wealth with a plan built around your life. Keybase advisors coordinate investments, retirement, tax, and estate strategy into one integrated wealth plan designed to last.",
    },
    {
      slug: "non-registered-investments",
      group: "Investment Solutions",
      eyebrow: "Investment Solutions",
      breadcrumbLabel: "Non-Registered Investments",
      heading: "Grow wealth beyond registered plans.",
      intro:
        "A non-registered account is a flexible investment account designed to help you grow and manage wealth outside of registered plans such as RRSPs and TFSAs — with no contribution limits, withdrawal restrictions, or maturity requirements.",
      heroImage: "/wealth-planning1.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Non-Registered Investments — Keybase Financial Group",
      seoDescription:
        "A non-registered account is a flexible investment account with no contribution limits, withdrawal restrictions, or maturity requirements — an ideal way to grow wealth beyond RRSPs and TFSAs. Keybase advisors help you invest with a tax-aware, goals-first strategy.",
    },
    {
      slug: "rdsp",
      group: "Investment Solutions",
      eyebrow: "Investment Solutions",
      breadcrumbLabel: "Registered Disability Savings Plan (RDSP)",
      heading: "Build lasting security for the future.",
      intro:
        "A Registered Disability Savings Plan (RDSP) is a long-term savings plan designed to help eligible Canadians with disabilities and their families build financial security — with tax-deferred growth and valuable government support.",
      heroImage: "/consult-advisors.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Registered Disability Savings Plan (RDSP) — Keybase Financial Group",
      seoDescription:
        "An RDSP is a long-term savings plan that helps eligible Canadians with disabilities and their families build financial security — with tax-deferred growth and government support through the Canada Disability Savings Grant and Bond. Keybase advisors help you review eligibility and build a strategy.",
    },
    {
      slug: "resp",
      group: "Investment Solutions",
      eyebrow: "Investment Solutions",
      breadcrumbLabel: "Registered Education Savings Plan (RESP)",
      heading: "Give their future a head start.",
      intro:
        "A Registered Education Savings Plan (RESP) is a tax-sheltered savings plan designed to help parents, grandparents, family members, and friends save for a child’s future education.",
      heroImage: "/education-planning1.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Registered Education Savings Plan (RESP) — Keybase Financial Group",
      seoDescription:
        "An RESP is a tax-sheltered plan that helps families save for a child's post-secondary education — with tax-deferred growth and government grants including the Canada Education Savings Grant and Canada Learning Bond. Keybase advisors help you maximize grants and build an education savings plan.",
    },
    {
      slug: "rrsp",
      group: "Investment Solutions",
      eyebrow: "Investment Solutions",
      breadcrumbLabel: "Registered Retirement Savings Plan (RRSP)",
      heading: "Save for retirement, save on taxes today.",
      intro:
        "A Registered Retirement Savings Plan (RRSP) is a registered investment account designed to help Canadians save for retirement while reducing taxable income today.",
      heroImage: "/retirement-planning3.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Registered Retirement Savings Plan (RRSP) — Keybase Financial Group",
      seoDescription:
        "An RRSP helps Canadians save for retirement while reducing taxable income today — with tax-deductible contributions and tax-deferred growth. Keybase advisors help you understand your contribution room, manage tax considerations, and build a retirement plan.",
    },
    {
      slug: "tfsa",
      group: "Investment Solutions",
      eyebrow: "Investment Solutions",
      breadcrumbLabel: "Tax-Free Savings Account (TFSA)",
      heading: "Grow your money, tax-free.",
      intro:
        "A Tax-Free Savings Account (TFSA) is a flexible savings and investment account that allows eligible Canadians to grow money tax-free — a valuable tool for both short-term savings and long-term goals.",
      heroImage: "/tax-planning2.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Tax-Free Savings Account (TFSA) — Keybase Financial Group",
      seoDescription:
        "A TFSA lets eligible Canadians grow money tax-free — with tax-free withdrawals and the flexibility to save for both short-term and long-term goals. Keybase advisors help you choose the right TFSA strategy and understand your contribution room.",
    },
    {
      slug: "fhsa",
      group: "Investment Solutions",
      eyebrow: "Investment Solutions",
      breadcrumbLabel: "First Home Savings Account (FHSA)",
      heading: "Save for your first home.",
      intro:
        "A First Home Savings Account (FHSA) is a registered savings plan designed to help eligible first-time home buyers save for a qualifying home in Canada.",
      heroImage: "/estate-planning2.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "First Home Savings Account (FHSA) — Keybase Financial Group",
      seoDescription:
        "An FHSA helps eligible first-time home buyers save for a qualifying home in Canada — combining tax-deductible contributions, tax-sheltered growth, and tax-free qualifying withdrawals. Keybase advisors help you understand eligibility, limits, and how an FHSA fits your plan.",
    },
    {
      slug: "traditional-investments",
      group: "Investment Solutions",
      eyebrow: "Investment Solutions",
      breadcrumbLabel: "Traditional Investments",
      heading: "Time-tested ways to build wealth.",
      intro:
        "Traditional investments include publicly traded stocks, bonds, cash, mutual funds, mutual fund ETFs, and guaranteed investment certificates — used to build portfolios focused on growth, income, capital preservation, or a combination of all three.",
      heroImage: "/estate-planning1.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Traditional Investments — Keybase Financial Group",
      seoDescription:
        "Traditional investments — stocks, bonds, cash, mutual funds, mutual fund ETFs, and GICs — used to build portfolios for growth, income, and capital preservation. Keybase advisors help you choose solutions aligned with your goals, time horizon, and risk tolerance.",
    },
    {
      slug: "alternative-investments",
      group: "Investment Solutions",
      eyebrow: "Investment Solutions",
      breadcrumbLabel: "Alternative Investments",
      heading: "Diversify beyond public markets.",
      intro:
        "Alternative investments reach beyond traditional asset classes like publicly traded stocks, bonds, and cash. For qualified investors, they can play a valuable role in portfolio diversification and long-term wealth planning.",
      heroImage: "/wealth-planning1.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Alternative Investments — Keybase Financial Group",
      seoDescription:
        "Alternative investments — private real estate, private equity, private debt, hedge funds, precious metals, and more — for qualified investors seeking diversification beyond public markets. As a registered Exempt Market Dealer, Keybase helps assess suitability and access private-market opportunities.",
    },
    {
      slug: "insurance",
      group: "Preservation Strategies",
      eyebrow: "Preservation Strategies",
      breadcrumbLabel: "Insurance",
      heading: "Protect what you’ve built.",
      intro:
        "Insurance helps protect your income, preserve wealth, and provide financial security for the people and responsibilities that matter most — a safety net for life’s unexpected moments.",
      heroImage: "/tax-planning1.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Insurance — Keybase Financial Group",
      seoDescription:
        "Insurance is an essential part of a strong financial plan — protecting your income, preserving wealth, and providing security for the people who matter most. Through Keybase Insurance Agency Ltd., advisors help you tailor coverage for individuals, families, and business owners.",
    },
    {
      slug: "travel-insurance",
      group: "Preservation Strategies",
      eyebrow: "Preservation Strategies",
      breadcrumbLabel: "Travel Insurance",
      heading: "Travel with peace of mind.",
      intro:
        "Whether you are travelling internationally, visiting another province, welcoming family to Canada, or studying away from home, travel insurance can be an important part of your overall protection plan.",
      heroImage: "/retirement-planning3.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Travel Insurance — Keybase Financial Group",
      seoDescription:
        "Travel insurance for Canadian residents, seniors, visitors to Canada, and students — covering emergency medical, trip cancellation, baggage, and more. Keybase advisors help you choose coverage that fits your destination, trip, and needs.",
    },
    {
      slug: "segregated-funds",
      group: "Preservation Strategies",
      eyebrow: "Preservation Strategies",
      breadcrumbLabel: "Segregated Funds",
      heading: "Growth with a layer of protection.",
      intro:
        "Segregated funds are investment products offered by Canadian insurance companies that combine market-based investment potential with certain insurance benefits.",
      heroImage: "/estate-planning1.jpg",
      ctaLabel: "Speak with an Advisor",
      ctaUrl: "/contact",
      seoTitle: "Segregated Funds — Keybase Financial Group",
      seoDescription:
        "Segregated funds combine market-based investment potential with insurance benefits — maturity and death benefit guarantees, beneficiary designations, and potential estate and creditor protection. Keybase advisors help you decide whether they fit your plan.",
    },
  ];

  return { pages };
}

// ---------------------------------------------------------------------------
// Careers — open positions (verbatim from components/careers/Careers.tsx).
// ---------------------------------------------------------------------------
export function seedCareers(): CareersContent {
  const roles = [
    {
      title: "Financial Advisor",
      department: "Advisory",
      location: "Toronto, ON · Hybrid",
      type: "Full-time",
      description:
        "Build and grow your own practice with the backing of an independent national platform and a disciplined, client-first process.",
    },
    {
      title: "Associate Advisor",
      department: "Advisory",
      location: "Mississauga, ON",
      type: "Full-time",
      description:
        "Support senior advisors across planning, research, and client service while developing toward your own book of business.",
    },
    {
      title: "Compliance Analyst",
      department: "Compliance & Risk",
      location: "Toronto, ON",
      type: "Full-time",
      description:
        "Help uphold the firm's regulatory, risk, and governance standards and protect the trust clients place in Keybase.",
    },
    {
      title: "Client Service Associate",
      department: "Operations",
      location: "Toronto, ON",
      type: "Full-time",
      description:
        "Deliver a seamless, personal client experience across onboarding, administration, and day-to-day support.",
    },
    {
      title: "Marketing Coordinator",
      department: "Marketing",
      location: "Remote · Canada",
      type: "Full-time",
      description:
        "Shape the Keybase brand and client experience across content, campaigns, and communications.",
    },
    {
      title: "IT Support Specialist",
      department: "Technology",
      location: "Toronto, ON",
      type: "Full-time",
      description:
        "Keep the firm's systems secure, reliable, and responsive so advisors can focus on their clients.",
    },
  ];

  return {
    hero: {
      eyebrow: "Careers",
      heading: "Build your career, independently.",
      intro:
        "At Keybase, you’ll do the best work of your career — backed by an independent, people-first firm that invests in your growth and puts clients first. Explore our open roles and find where you belong.",
    },
    roles: roles.map((r) => ({
      id: seedId("role", r.title),
      title: r.title,
      department: r.department,
      location: r.location,
      type: r.type,
      description: r.description,
      isVisible: true,
    })),
  };
}

// ---------------------------------------------------------------------------
// Newsroom — articles (verbatim from components/newsroom/Newsroom.tsx).
// ---------------------------------------------------------------------------
export function seedNewsroom(): NewsroomContent {
  const articles = [
    {
      category: "Markets",
      title: "Positioning Portfolios for a Higher-for-Longer Rate Environment",
      excerpt:
        "What persistent rates mean for fixed income, equities, and the disciplined, goals-based portfolios we build for clients.",
      date: "2026.06.22",
      author: "Keybase Research",
    },
    {
      category: "Retirement",
      title: "Building Durable Income That Outlasts a 30-Year Retirement",
      excerpt:
        "A framework for turning a lifetime of savings into reliable, tax-efficient income that lasts through every market cycle.",
      date: "2026.06.15",
      author: "Keybase Planning Desk",
    },
    {
      category: "Tax & Estate",
      title: "Five Estate Strategies High-Net-Worth Families Should Revisit This Year",
      excerpt:
        "From intergenerational transfers to trust structures, the planning moves worth reviewing before year-end.",
      date: "2026.06.08",
      author: "Keybase Research",
    },
    {
      category: "Insurance",
      title: "How the Right Coverage Protects What You've Worked to Build",
      excerpt:
        "Why integrated protection — life, disability, and critical illness — belongs at the center of a complete financial plan.",
      date: "2026.05.30",
      author: "Keybase Planning Desk",
    },
    {
      category: "Investing",
      title: "The Case for Discipline When Markets Get Loud",
      excerpt:
        "Headlines move fast; sound plans don't. How an independent, research-driven process keeps clients on course.",
      date: "2026.05.21",
      author: "Keybase Research",
    },
    {
      category: "Firm News",
      title: "Keybase Expands Its Advisory Team Across Canada",
      excerpt:
        "New advisors and specialists join the firm as Keybase continues to grow its independent national platform.",
      date: "2026.05.12",
      author: "Keybase Financial Group",
    },
    {
      category: "Markets",
      title: "What Independent Advice Means in a Volatile Year",
      excerpt:
        "Free from product quotas and competing incentives, independence lets us focus on a single question: what is right for you.",
      date: "2026.05.04",
      author: "Keybase Research",
    },
  ];

  return {
    hero: {
      eyebrow: "Newsroom",
      heading: "News & Perspectives",
      intro:
        "Market intelligence, planning insights, and global financial trends — curated by the Keybase Financial Group team.",
    },
    articles: articles.map((a, i) => ({
      id: seedId("article", `${i}-${a.title}`),
      category: a.category,
      title: a.title,
      excerpt: a.excerpt,
      date: a.date,
      author: a.author,
      isVisible: true,
    })),
  };
}

// ---------------------------------------------------------------------------
// Standalone content pages (About, CEO Message) — hero + SEO.
// ---------------------------------------------------------------------------
export function seedContentPages(): ContentPagesContent {
  return {
    pages: [
      {
        slug: "about",
        label: "About Us",
        eyebrow: "About Keybase Financial Group",
        heading: "Independent Advice. National Reach. Built for the Future.",
        intro:
          "Founded in 1997, Keybase Financial Group was built with a clear purpose: to help Canadians build, protect, and preserve their personal wealth through trusted independent financial advice.",
        seoTitle: "About Us — Keybase Financial Group",
        seoDescription:
          "Founded in 1997, Keybase Financial Group is a Canadian, independently owned advisory firm helping Canadians build, protect, and preserve their personal wealth through trusted independent financial advice.",
      },
      {
        slug: "ceo-message",
        label: "CEO Message",
        eyebrow: "",
        heading: "Message from the CEO",
        intro: "",
        seoTitle: "A Message from our CEO — Keybase Financial Group",
        seoDescription:
          "A personal message from Dax Sukhraj, President & CEO of Keybase Financial Group, on the firm's philosophy and its promise to every client.",
      },
    ],
  };
}
