import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Newsroom from "@/components/newsroom/Newsroom";
import {
  getPublishedNewsroom,
  getVisiblePublishedArticles,
} from "@/lib/cms/public";

export async function generateMetadata() {
  const { hero } = await getPublishedNewsroom();
  return {
    title: "Newsroom — Keybase Financial Group",
    description:
      hero.intro ||
      "Market intelligence, planning insights, and perspectives on building, protecting, and preserving wealth — curated by the Keybase Financial Group team.",
  };
}

export default async function NewsroomPage() {
  const [{ hero }, articles] = await Promise.all([
    getPublishedNewsroom(),
    getVisiblePublishedArticles(),
  ]);
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-12 sm:px-8 sm:pb-28 sm:pt-16">
        {/* Heading */}
        <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#006d6e]">
          {hero.eyebrow}
        </p>
        <h1 className="mt-4 font-serif text-[44px] font-normal leading-[1.04] tracking-tight text-[#0a1f33] sm:text-[64px]">
          {hero.heading}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#5b6573]">
          {hero.intro}
        </p>

        {/* Interactive list */}
        <div className="mt-12">
          <Newsroom articles={articles} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
