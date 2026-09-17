import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import KeyExecutives, { type Executive } from "@/components/home/KeyExecutives";
import { getLeadershipProfiles, profilePathIfReady } from "@/lib/people/leadership";
import type { PersonProfile } from "@/lib/people/types";
import JsonLd from "@/lib/seo/jsonLd";
import { keybasePeopleSchema } from "@/lib/seo/keybase";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata("/key-executives", "Key Executives — Keybase Financial Group", "Meet the leadership team of Keybase Financial Group — seasoned professionals across wealth management, compliance, and corporate strategy.");

// Always render fresh so edits made in the /website-admin-cms ERP appear immediately.
export const dynamic = "force-dynamic";

/**
 * The team, as one list of people.
 *
 * The seven biographies that used to be transcribed into this file as a
 * fallback now live in the people registry (lib/people/people.ts), which is
 * also what seeds the CMS — so there is one copy of each person, not three.
 * `getLeadershipProfiles` merges the CMS's published edits over the registry
 * and falls back to it if the store cannot be read.
 */
function toCard(person: PersonProfile): Executive {
  return {
    name: person.name,
    title: person.role ?? "",
    lead: person.shortBio ?? "",
    paragraphs: person.bio ?? [],
    photo: person.image?.src,
    photoAlt: person.image?.alt,
    photoClassName: person.image?.className,
    comingSoon: person.portraitPending,
    ceoMessage: person.authoredPagePath === "/ceo-message",
    profilePath: profilePathIfReady(person),
  };
}

function Crumb({ label, href }: { label: string; href?: string }) {
  return href ? (
    <Link href={href} className="text-[#9aa3ad] transition-colors hover:text-[#006d6e]">
      {label}
    </Link>
  ) : (
    <span className="text-[#1a2433]">{label}</span>
  );
}

export default async function KeyExecutivesPage() {
  const leadership = await getLeadershipProfiles();

  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />
      <BreadcrumbSchema items={[{ name: "Key Executives", path: "/key-executives" }]} />

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
          <KeyExecutives people={leadership.map(toCard)} />
        </div>

        {/* Person entities for the published leadership team. */}
        <JsonLd data={keybasePeopleSchema(leadership)} />
      </main>

      <SiteFooter />
    </div>
  );
}
