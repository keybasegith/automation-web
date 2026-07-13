import Link from "next/link";
import { ChevronRight } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import AdvisorMap from "@/components/home/AdvisorMap";

export const metadata = {
  title: "Our Advisors — Keybase Financial Group",
  description:
    "A national network of 200+ Keybase advisors serving clients from coast to coast — close to the communities they guide through every stage of their financial journey.",
};

function Crumb({ label, href }: { label: string; href?: string }) {
  return href ? (
    <Link href={href} className="text-[#9aa3ad] transition-colors hover:text-[#006d6e]">
      {label}
    </Link>
  ) : (
    <span className="text-[#1a2433]">{label}</span>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-serif text-[32px] leading-none sm:text-[40px] ${
          accent ? "text-[#006d6e]" : "text-[#0a1f33]"
        }`}
      >
        {value}
      </p>
      <div className="mt-2 h-px w-6 bg-[#006d6e]/50" />
      <p className="mt-2 text-[12px] leading-snug text-[#5b6573]">{label}</p>
    </div>
  );
}

export default function OurAdvisorsPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <main className="mx-auto flex min-h-[calc(100vh-112px)] max-w-[1280px] flex-col px-5 py-6 sm:px-8 sm:py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[14px]">
          <Crumb label="Home" href="/" />
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          <Crumb label="Our Team" />
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          <Crumb label="Our Advisors" />
        </nav>

        {/* Hero: merged copy + coast-to-coast map, sized to fit one screen */}
        <div className="grid flex-1 items-center gap-8 py-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#006d6e]">
              <span className="h-px w-8 bg-[#006d6e]/50" />
              Coast to coast
            </p>
            <h1 className="mt-4 font-serif text-[38px] font-normal leading-[1.04] tracking-tight text-[#0a1f33] sm:text-[50px]">
              Our Advisors
            </h1>

            {/* Headline figure */}
            <div className="mt-6 flex items-end gap-4">
              <span className="font-serif text-[64px] leading-[0.82] text-[#0a1f33] sm:text-[84px]">
                200+
              </span>
              <span className="mb-2 text-[13px] font-semibold uppercase leading-tight tracking-[0.14em] text-[#5b6573]">
                Advisors
                <br />
                across Canada
              </span>
            </div>

            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[#5b6573] sm:text-[16px]">
              A national network reaching from the Pacific to the Atlantic and up
              into the territories — always close to the communities they serve.
              Wherever you are in Canada, there&rsquo;s a Keybase advisor ready to
              guide you through every stage of your financial journey.
            </p>

            <div className="mt-8 grid max-w-sm grid-cols-3 gap-6">
              <Stat value="13" label="Provinces & territories" />
              <Stat value="22" label="Cities served" />
              <Stat value="6" label="Languages spoken" />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[min(340px,44vh)] lg:max-w-[min(560px,64vh)]">
            <AdvisorMap />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
