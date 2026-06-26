import {
  Compass,
  ShieldCheck,
  Users,
  Rocket,
  MapPin,
  Heart,
} from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";

export const metadata = {
  title: "About Us — Keybase Financial Group",
  description:
    "Founded in 1997, Keybase Financial Group is a Canadian, independently owned advisory firm helping Canadians build, protect, and preserve their personal wealth through trusted independent financial advice.",
};

const VALUES = [
  {
    icon: Compass,
    title: "Independent by Design",
    body: "Independence is our advantage. It allows us to think clearly, act objectively, and provide advice that is aligned with the needs of our clients and advisors.",
  },
  {
    icon: Users,
    title: "Human-Centered",
    body: "Technology will continue to transform financial services, but people remain at the center of every meaningful financial decision. We believe the future of advice is human, enhanced by technology, not replaced by it.",
  },
  {
    icon: ShieldCheck,
    title: "Built on Trust",
    body: "Long-term financial success requires consistency, transparency, and accountability. We believe in building lasting relationships through trusted advice and continuity with one dedicated advisor.",
  },
  {
    icon: Rocket,
    title: "Entrepreneurial at the Core",
    body: "We operate with the mindset of builders. We challenge traditional models, adapt quickly, and create opportunities in a changing financial landscape.",
  },
  {
    icon: MapPin,
    title: "National in Reach, Community in Spirit",
    body: "With representation across major provinces, Keybase continues to grow its presence in communities across Canada. We believe financial advice should be accessible, personal, and connected to the people it serves.",
  },
  {
    icon: Heart,
    title: "Committed to Impact",
    body: "Our responsibility extends beyond financial planning. Each year, Keybase supports charitable initiatives across Canada, contributing to causes that strengthen communities and create opportunity for others.",
  },
];

export default function AboutPage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
        {/* background video — reuses the first home-page hero clip */}
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        >
          <source src="/hero-section-vid1.mp4" type="video/mp4" />
        </video>
        {/* dark overlay keeps the copy legible over the video */}
        <div
          className="pointer-events-none absolute inset-0 bg-[#0a1f33]/45"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
            About Keybase Financial Group
          </p>
          <h1
            className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
            style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
          >
            Independent Advice. National Reach. Built for the Future.
          </h1>
          <p
            className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
          >
            Founded in 1997, Keybase Financial Group was built with a clear
            purpose: to help Canadians build, protect, and preserve their
            personal wealth through trusted independent financial advice.
          </p>
        </div>
      </section>

      {/* ---------- Who We Are ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Who We Are
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Built around the individual — not the institution.
            </h2>
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              For more than two decades, Keybase has grown with a simple belief:
              financial advice should be personal, disciplined, and built around
              the individual — not the institution.
            </p>
            <p>
              As a Canadian and independently owned firm, we are not driven by
              the priorities of a bank, insurance company, or large corporate
              parent. Our independence gives our advisors the freedom to focus on
              what matters most: the client.
            </p>
            <p>
              We provide access to a broad range of investment solutions,
              strategic guidance, and long-term planning support designed to help
              Canadians move forward with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Our Vision ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Our Vision
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Canada&rsquo;s leading independent advisory platform.
              </h2>
            </div>
            <div className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Our vision is to become Canada&rsquo;s leading independent
                financial advisory platform — where human connection, trusted
                advice, and modern innovation work together to shape better
                financial futures.
              </p>
              <p>
                Founder and CEO Dax Sukhraj built Keybase with one mission in
                mind: to help Canadians reach their financial goals and live with
                greater freedom, security, and peace of mind. That mission
                continues to guide us today.
              </p>
              <p>
                We believe wealth is more than numbers. It is family, legacy,
                opportunity, and confidence in the future. Every client has a
                different story, a different path, and a different dream. Our role
                is to help create the roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- What Defines Us ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              What Defines Us
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              The principles behind everything we do.
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value, i) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#0a1f33]/20 hover:shadow-[0_28px_60px_-32px_rgba(10,31,51,0.45)]"
                >
                  {/* top accent bar reveals on hover */}
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#0a1f33] to-[#006d6e] transition-transform duration-300 group-hover:scale-x-100"
                    aria-hidden
                  />
                  {/* ghost index number */}
                  <span
                    className="pointer-events-none absolute right-6 top-5 select-none font-serif text-[56px] leading-none text-[#0a1f33]/[0.05]"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0a1f33] text-white transition-colors duration-300 group-hover:bg-[#006d6e]">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-7 font-serif text-2xl font-normal text-[#0a1f33]">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                    {value.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- The Keybase Standard ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        {/* background image */}
        <img
          src="/consult-advisors.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        {/* dark overlay keeps the copy legible over the image */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/50 via-[#0a1f33]/35 to-[#0a1f33]/10"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-3xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
              The Keybase Standard
            </p>
            <h2
              className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-white sm:text-[44px]"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
            >
              We are building more than a financial services firm.
            </h2>
            <div
              className="mt-7 space-y-6 text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              <p>
                We are building a trusted national platform for independent
                advisors, Canadian families, and the next generation of wealth.
              </p>
              <p>
                Keybase exists to help people move forward — with clarity,
                confidence, and purpose.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
