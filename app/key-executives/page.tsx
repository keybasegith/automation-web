import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import KeyExecutives, { type Executive } from "@/components/home/KeyExecutives";

export const metadata = {
  title: "Key Executives — Keybase Financial Group",
  description:
    "Meet the leadership team of Keybase Financial Group — seasoned professionals across wealth management, compliance, and corporate strategy.",
};

const LEADERSHIP: Executive[] = [
  {
    name: "Dax Sukhraj",
    title: "President & CEO",
    photo: "/dax-profile-updated.jpg",
    lead: "Dax Sukhraj is President & CEO at Keybase Financial Group.",
    paragraphs: [
      "As President & CEO, Mr. Sukhraj sets the strategic direction of the firm, championing an independent, client-first model built on transparency and disciplined advice.",
      "Prior to leading Keybase, he held senior roles across wealth management and capital markets, advising individuals, families, and institutions through every stage of the market cycle.",
      "Mr. Sukhraj has more than two decades of experience in the financial services industry and remains personally committed to building durable relationships that span generations.",
    ],
    href: "/businesscard-dax",
  },
  {
    name: "Mark Garcia",
    title: "Chief Compliance Officer",
    photo: "/mark-profile.jpg",
    lead: "Mark Garcia is Chief Compliance Officer at Keybase Financial Group.",
    paragraphs: [
      "Mr. Garcia oversees the firm's regulatory, risk, and governance framework, ensuring every client engagement meets the highest standards of integrity and fiduciary care.",
      "He has held senior compliance and risk leadership roles across the financial services industry, building programs that protect clients while enabling responsible growth.",
      "Mr. Garcia is recognized for embedding a culture of accountability and transparency throughout every level of the organization.",
    ],
    href: "/businesscard-mark",
  },
  {
    name: "Krissy Sukhraj",
    title: "Director of Marketing & Corporate Strategy",
    photo: "/krissy-profile.jpg",
    lead: "Krissy Sukhraj is Director of Marketing & Corporate Strategy at Keybase Financial Group.",
    paragraphs: [
      "Ms. Sukhraj shapes the firm's brand, client experience, and long-term strategic direction, connecting the Keybase story with the families and institutions it serves.",
      "She brings extensive experience across marketing, communications, and corporate strategy, with a focus on building meaningful, lasting client relationships.",
      "Ms. Sukhraj leads the firm's growth initiatives and is dedicated to ensuring the Keybase experience is clear, personal, and consistent at every touchpoint.",
    ],
    href: "/businesscard-krissy",
  },
];

function Crumb({ label, href }: { label: string; href?: string }) {
  return href ? (
    <Link href={href} className="text-[#9aa3ad] transition-colors hover:text-[#006d6e]">
      {label}
    </Link>
  ) : (
    <span className="text-[#1a2433]">{label}</span>
  );
}

export default function KeyExecutivesPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 sm:px-8 sm:pb-28 sm:pt-14">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[14px]">
          <Crumb label="Home" href="/" />
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          <Crumb label="About Us" href="/about" />
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          <Crumb label="Leadership" />
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          <Crumb label="Key Executives" />
        </nav>

        {/* Title */}
        <h1 className="mt-7 font-serif text-[40px] font-normal leading-[1.05] tracking-tight text-[#0a1f33] sm:text-[52px]">
          Key Executives
        </h1>

        {/* Interactive executives */}
        <div className="mt-14 sm:mt-16">
          <KeyExecutives people={LEADERSHIP} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
