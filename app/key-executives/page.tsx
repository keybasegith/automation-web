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
    photo: "/keith-profile2.jpg",
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
    photo: "/krissy-newprofile.jpg",
    photoClassName: "scale-110",
    lead: "Krissy Sukhraj is Director of Marketing & Corporate Strategy at Keybase Financial Group.",
    paragraphs: [
      "Ms. Sukhraj shapes the firm's brand, client experience, and long-term strategic direction, connecting the Keybase story with the families and institutions it serves.",
      "She brings extensive experience across marketing, communications, and corporate strategy, with a focus on building meaningful, lasting client relationships.",
      "Ms. Sukhraj leads the firm's growth initiatives and is dedicated to ensuring the Keybase experience is clear, personal, and consistent at every touchpoint.",
    ],
    href: "/businesscard-krissy",
  },
  {
    name: "Mark Garcia",
    title: "Chief Compliance Officer",
    photo: "/mark-newprofilepic.jpg",
    lead: "Mark Garcia is Chief Compliance Officer at Keybase Financial Group.",
    paragraphs: [
      "Mr. Garcia oversees the firm's regulatory, risk, and governance framework, ensuring every client engagement meets the highest standards of integrity and fiduciary care.",
      "He has held senior compliance and risk leadership roles across the financial services industry, building programs that protect clients while enabling responsible growth.",
      "Mr. Garcia is recognized for embedding a culture of accountability and transparency throughout every level of the organization.",
    ],
    href: "/businesscard-mark",
  },
  {
    name: "Pushpa Shivanthan",
    title: "Vice President, Back Office Administration",
    photo: "/pushpa-profile2.jpg",
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
    photo: "/jerome-profile.jpg",
    lead: "Jerome Pare is Senior I.T. Specialist at Keybase Financial Group.",
    paragraphs: [
      "Mr. Pare supports the firm's information technology systems, ensuring secure, reliable, and responsive infrastructure across the organization.",
      "He brings hands-on experience across IT operations, security, and support within the financial services industry.",
      "Mr. Pare is dedicated to keeping the firm's technology running smoothly so advisors and staff can focus on serving clients.",
    ],
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
        <div className="mt-10 sm:mt-12">
          <KeyExecutives people={LEADERSHIP} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
