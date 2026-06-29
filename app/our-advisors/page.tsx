import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";

export const metadata = {
  title: "Our Advisors — Keybase Financial Group",
  description:
    "Meet the advisors and team members of Keybase Financial Group — dedicated professionals who guide clients through every stage of their financial journey.",
};

type Member = {
  name: string;
  title: string;
  photo: string;
  email: string;
  phone: string;
  specialties: string[];
  comingSoon?: boolean;
  imgPosition?: string;
  href?: string;
};

const TEAM: Member[] = [
  {
    name: "Darko Strukan",
    title: "Financial Advisor",
    photo: "/darko-profile.jpg",
    imgPosition: "object-[center_25%] scale-150",
    email: "dstrukan@keybase.com",
    phone: "905-709-7911 Ext. 2216",
    specialties: [
      "Retirement & income planning",
      "Estate transfer; TFSA, RRSP & RESP strategies",
    ],
    href: "/businesscard-darko",
  },
  {
    name: "Jaxon Keelan",
    title: "Financial Advisor",
    photo: "/jaxon-newprofile.jpg",
    email: "jkeelan@keybase.com",
    phone: "905-709-7911",
    specialties: [
      "Providing personalized investment strategies for long-term financial growth and security",
    ],
    href: "/businesscard-jaxon",
  },
  {
    name: "Neil Alford",
    title: "Financial & Insurance Advisor",
    photo: "/neil-profile-background.jpg",
    comingSoon: true,
    email: "nalford@keybase.com",
    phone: "905-709-7911 Ext. 2235",
    specialties: [
      "Integrated financial & insurance planning",
      "Life, disability & critical illness coverage",
      "Business & family protection; investment strategies",
    ],
    href: "/businesscard-neil",
  },
  {
    name: "Shomari Hutchinson",
    title: "Financial Advisor",
    photo: "/shomari-profile.jpg",
    comingSoon: true,
    email: "shutchinson@keybase.com",
    phone: "905-709-7911 Ext. 2231",
    specialties: [
      "Comprehensive financial planning",
      "Goals-based portfolio management",
      "Retirement & education savings; risk management",
    ],
    href: "/businesscard-shomari",
  },
  {
    name: "Johnathan Leung",
    title: "Financial Advisor",
    photo: "/johnathan-profile1.jpg",
    comingSoon: true,
    email: "jleung@keybase.com",
    phone: "905-709-7911",
    specialties: [
      "Personal wealth building & preservation",
      "Tailored investment strategies",
      "Retirement, tax-efficient & estate planning",
    ],
    href: "/profile-jleung",
  },
  {
    name: "Olivia Bennett",
    title: "Financial Advisor",
    photo: "",
    comingSoon: true,
    email: "obennett@keybase.com",
    phone: "905-709-7911 Ext. 2240",
    specialties: [
      "Comprehensive wealth planning",
      "Goals-based portfolio management",
      "Retirement & income strategies",
    ],
  },
  {
    name: "Marcus Tan",
    title: "Financial & Insurance Advisor",
    photo: "",
    comingSoon: true,
    email: "mtan@keybase.com",
    phone: "905-709-7911 Ext. 2241",
    specialties: [
      "Integrated financial & insurance planning",
      "Life, disability & critical illness coverage",
      "Family & business protection strategies",
    ],
  },
  {
    name: "Priya Nair",
    title: "Financial Advisor",
    photo: "",
    comingSoon: true,
    email: "pnair@keybase.com",
    phone: "905-709-7911 Ext. 2242",
    specialties: [
      "Personal & family financial planning",
      "Tax-efficient investment strategies",
      "Education & retirement savings",
    ],
  },
  {
    name: "Samuel Reyes",
    title: "Financial Advisor",
    photo: "",
    comingSoon: true,
    email: "sreyes@keybase.com",
    phone: "905-709-7911 Ext. 2243",
    specialties: [
      "Wealth accumulation & preservation",
      "Disciplined, research-driven investing",
      "Estate & legacy planning",
    ],
  },
  {
    name: "Hannah Cohen",
    title: "Financial & Insurance Advisor",
    photo: "",
    comingSoon: true,
    email: "hcohen@keybase.com",
    phone: "905-709-7911 Ext. 2244",
    specialties: [
      "Holistic financial & insurance advice",
      "Income protection & coverage planning",
      "Retirement & investment strategies",
    ],
  },
  {
    name: "David Okafor",
    title: "Financial Advisor",
    photo: "",
    comingSoon: true,
    email: "dokafor@keybase.com",
    phone: "905-709-7911 Ext. 2245",
    specialties: [
      "Goals-based wealth management",
      "Retirement & income planning",
      "Tax-efficient & estate strategies",
    ],
  },
  {
    name: "Sophie Tremblay",
    title: "Financial Advisor",
    photo: "",
    comingSoon: true,
    email: "stremblay@keybase.com",
    phone: "905-709-7911 Ext. 2246",
    specialties: [
      "Comprehensive financial planning",
      "Portfolio construction & management",
      "Education & retirement savings",
    ],
  },
  {
    name: "Aaron Goldberg",
    title: "Financial Advisor",
    photo: "",
    comingSoon: true,
    email: "agoldberg@keybase.com",
    phone: "905-709-7911 Ext. 2247",
    specialties: [
      "Personal wealth building & preservation",
      "Tailored investment strategies",
      "Retirement & legacy planning",
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

function MemberCard({ member }: { member: Member }) {
  const NameTag = (
    <div>
      <h3 className="text-[22px] font-bold leading-tight text-[#1a2433]">
        {member.name}
      </h3>
      <p className="mt-1 text-[13px] text-[#9aa3ad]">{member.title}</p>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Portrait */}
      <div className="aspect-[6/7] w-full overflow-hidden bg-[#dfe3e8]">
        {member.comingSoon ? (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#dfe3e8] text-center">
            <span className="font-serif text-[18px] text-[#9aa3ad]">Coming</span>
            <span className="font-serif text-[18px] text-[#9aa3ad]">Soon</span>
          </div>
        ) : (
          <img
            src={member.photo}
            alt={`${member.name} portrait`}
            className={`h-full w-full object-cover ${member.imgPosition ?? "object-top"}`}
          />
        )}
      </div>

      {/* Name + role */}
      <div className="mt-5">
        {member.href ? (
          <Link href={member.href} className="transition-opacity hover:opacity-80">
            {NameTag}
          </Link>
        ) : (
          NameTag
        )}
      </div>

      {/* Contact */}
      <div className="mt-4">
        <a
          href={`mailto:${member.email}`}
          className="text-[15px] text-[#006d6e] transition-colors hover:text-[#0a1f33]"
        >
          {member.email}
        </a>
        <p className="mt-1.5 text-[15px] text-[#1a2433]">TEL. {member.phone}</p>
      </div>

      {/* Divider */}
      <div className="mt-4 border-t border-black/10" />

      {/* Specialties */}
      <div className="mt-4 space-y-0.5 text-[15px] leading-relaxed text-[#5b6573]">
        {member.specialties.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

export default function OurAdvisorsPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-10 sm:px-8 sm:pb-28 sm:pt-14">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[14px]">
          <Crumb label="Home" href="/" />
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          <Crumb label="Our Team" />
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          <Crumb label="Our Advisors" />
        </nav>

        {/* Title */}
        <h1 className="mt-7 font-serif text-[40px] font-normal leading-[1.05] tracking-tight text-[#0a1f33] sm:text-[52px]">
          Our Advisors
        </h1>

        {/* Team grid */}
        <div className="mt-10 grid gap-8 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((member) => (
            <MemberCard key={member.name} member={member} />
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
