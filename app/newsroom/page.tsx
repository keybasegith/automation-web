import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Newsroom from "@/components/newsroom/Newsroom";

export const metadata = {
  title: "Newsroom — Keybase Financial Group",
  description:
    "Market intelligence, planning insights, and perspectives on building, protecting, and preserving wealth — curated by the Keybase Financial Group team.",
};

export default function NewsroomPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-12 sm:px-8 sm:pb-28 sm:pt-16">
        {/* Heading */}
        <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#006d6e]">
          Newsroom
        </p>
        <h1 className="mt-4 font-serif text-[44px] font-normal leading-[1.04] tracking-tight text-[#0a1f33] sm:text-[64px]">
          News &amp; Perspectives
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#5b6573]">
          Market intelligence, planning insights, and global financial trends —
          curated by the Keybase Financial Group team.
        </p>

        {/* Interactive list */}
        <div className="mt-12">
          <Newsroom />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
