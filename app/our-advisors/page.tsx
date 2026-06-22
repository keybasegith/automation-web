import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  bio: string;
  href?: string;
};

const TEAM: Member[] = [
  {
    name: "Darko Strukan",
    title: "Financial Advisor",
    photo: "/darko-profile.jpg",
    bio: "Darko partners with clients to build disciplined, goals-based portfolios designed around each individual's circumstances and time horizon.",
    href: "/businesscard-darko",
  },
  {
    name: "Neil Alford",
    title: "Financial & Insurance Advisor",
    photo: "/neil-profile-background.jpg",
    bio: "Neil delivers integrated planning across investments and protection, helping clients safeguard their families, businesses, and long-term security.",
    href: "/businesscard-neil",
  },
  {
    name: "Shomari Hutchinson",
    title: "Financial Advisor",
    photo: "/shomari-profile.jpg",
    bio: "Shomari guides clients through every stage of the planning journey with clarity and the rigor of an institutional process.",
    href: "/businesscard-shomari",
  },
  {
    name: "Johnathan Leung",
    title: "Financial Advisor",
    photo: "/johnathan-profile1.jpg",
    bio: "Johnathan focuses on building and preserving personal wealth, crafting tailored strategies that grow and protect what his clients have earned.",
    href: "/profile-jleung",
  },
];

function MemberCard({ member }: { member: Member }) {
  const card = (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-black/10 bg-white transition-shadow hover:shadow-lg hover:shadow-black/5">
      <div className="aspect-[4/5] w-full overflow-hidden bg-[#eaeef2]">
        <img
          src={member.photo}
          alt={`${member.name} portrait`}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-2xl font-normal text-[#0a1f33]">
          {member.name}
        </h3>
        <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#006d6e]">
          {member.title}
        </p>
        <p className="mt-4 flex-1 text-[15px] leading-relaxed text-[#5b6573]">
          {member.bio}
        </p>
        {member.href && (
          <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#0a1f33]">
            View profile
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        )}
      </div>
    </div>
  );

  return member.href ? (
    <Link href={member.href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}

export default function OurAdvisorsPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="border-b border-black/10 bg-[#0a1f33] text-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/60">
            Our Team
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]">
            Our Advisors
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/75">
            Behind every plan is a dedicated advisor. Our team brings clarity,
            patience, and the rigor of an institutional process to every client
            relationship — guiding you through each stage of your financial
            journey.
          </p>
        </div>
      </section>

      {/* ---------- Team grid ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
            Advisory Team
          </p>
          <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
            Advisors dedicated to your goals.
          </h2>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((member) => (
            <MemberCard key={member.name} member={member} />
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid items-center gap-10 rounded-lg bg-[#0a1f33] px-8 py-14 text-white sm:px-14 lg:grid-cols-2 lg:gap-16">
            <h2 className="font-serif text-[32px] font-normal leading-[1.1] tracking-tight sm:text-[40px]">
              Meet the people leading the firm.
            </h2>
            <div className="lg:pl-8">
              <p className="text-lg leading-relaxed text-white/75">
                Our executive leadership brings decades of experience across
                wealth management, compliance, and corporate strategy.
              </p>
              <Link
                href="/key-executives"
                className="mt-8 inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] transition-colors hover:bg-white/90"
              >
                Meet our Key Executives
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
