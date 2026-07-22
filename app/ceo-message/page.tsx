import Link from "next/link";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import { getPublishedContentPage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedContentPage("ceo-message");
  return { title: page.seoTitle, description: page.seoDescription };
}

export default async function CeoMessagePage() {
  const page = await getPublishedContentPage("ceo-message");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Page heading ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 pt-12 sm:px-8 sm:pt-16">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-[15px] text-[#5b6573]"
        >
          <Link href="/" className="transition-colors hover:text-[#0a1f33]">
            Home
          </Link>
          <span className="text-[#c2c8d0]">/</span>
          <Link href="/about" className="transition-colors hover:text-[#0a1f33]">
            About Us
          </Link>
          <span className="text-[#c2c8d0]">/</span>
          <Link
            href="/key-executives"
            className="transition-colors hover:text-[#0a1f33]"
          >
            Leadership
          </Link>
          <span className="text-[#c2c8d0]">/</span>
          <span className="font-semibold text-[#0a1f33]">CEO Message</span>
        </nav>
        <h1 className="mt-8 font-serif text-[44px] font-normal leading-[1.06] tracking-tight text-[#0a1f33] sm:text-[64px]">
          {page.heading}
        </h1>
      </section>

      {/* ---------- Letter ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_300px] lg:gap-16">
          {/* Letter body */}
          <div className="max-w-2xl">
            <div className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                As the founder and president of both Argosy and Keybase — both
                true independent dealers — for more than four decades in the
                industry, I have had the privilege of working alongside advisors,
                clients, employees, and industry partners who have shaped my
                understanding of leadership and stewardship.
              </p>
              <p>
                I believe leadership is not about titles or authority — it is
                about earning trust, creating opportunities for others, and
                showing up consistently when it matters most. Throughout my
                career, I have sought to lead with authenticity, humility, and a
                long-term perspective, recognizing that strong relationships,
                sound judgment, and unwavering integrity are the foundations of
                lasting success.
              </p>
              <p>
                My vision has always been to build an organization where people
                can grow, thrive, and achieve more than they thought possible
                without compromising integrity. Whether mentoring the next
                generation of leaders, supporting entrepreneurial advisors, or
                helping families navigate important financial decisions, I am
                driven by the belief that business is ultimately about people,
                moments, and promises. Success is measured not by results alone,
                but by the positive impact we have on the lives we touch and the
                well-being we help create. My goal is to leave behind an
                organization, relationships, and communities that are stronger
                because we worked together — with purpose, respect, and a shared
                commitment to excellence.
              </p>
              <p>
                My mantra of leadership, through many years of experience, is
                relationship-focused, community-minded, and guided by learned
                wisdom and service rather than corporate credentials. It is all
                about my vision of authentic leadership, mentorship, human
                connection, and legacy. My greatest achievement will not be what I
                have built personally — it will be the care, kindness, and
                compassion I have shown, the people I have helped develop, the
                careers I have influenced, and the legacy of values and humility
                that continues long after my own journey.
              </p>
            </div>

            {/* Signature */}
            <div className="mt-12 border-t border-black/10 pt-8">
              <img
                src="/dax-signature.jpg"
                alt="Dax Sukhraj signature"
                className="mb-4 h-20 w-auto"
              />
              <p className="font-serif text-[28px] font-normal italic text-[#0a1f33]">
                Dax Sukhraj
              </p>
              <p className="mt-2 text-[15px] text-[#5b6573]">
                President &amp; Chief Executive Officer, Keybase Financial Group
              </p>
            </div>

          </div>

          {/* Portrait + identity */}
          <aside className="lg:sticky lg:top-28 lg:self-start lg:order-last">
            <div className="overflow-hidden rounded-lg bg-[#eaeef2]">
              <img
                src="/dax-profile-updated.jpg"
                alt="Dax Sukhraj, President & CEO"
                className="aspect-[4/5] w-full object-cover object-top"
              />
            </div>
            <h2 className="mt-6 text-center font-serif text-2xl font-normal text-[#0a1f33]">
              Dax Sukhraj
            </h2>
            <p className="mt-1 text-center text-[13px] font-semibold uppercase tracking-[0.12em] text-[#006d6e]">
              President &amp; Chief Executive Officer
            </p>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
