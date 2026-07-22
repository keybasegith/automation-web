import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import Reveal from "@/components/home/Reveal";
import ServiceHero from "@/components/home/ServiceHero";
import { getPublishedServicePage } from "@/lib/cms/public";

export async function generateMetadata() {
  const page = await getPublishedServicePage("tax-planning");
  return { title: page.seoTitle, description: page.seoDescription };
}

const CONSIDERATIONS = [
  "Investment income allocation",
  "Registered investments",
  "Tax-Free Savings Accounts",
  "RRSP and RRIF strategies",
  "Borrowing to invest",
  "Income splitting opportunities",
  "Education funding strategies",
  "Estate preservation strategies",
  "Capital gains planning",
  "Tax shelter considerations",
];

export default async function TaxPlanningPage() {
  const page = await getPublishedServicePage("tax-planning");
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <ServiceHero content={page} scrimClassName="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent" />

      {/* ---------- Keep More of What You Earn ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Why It Matters
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Keep More of What You Earn
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Tax-efficient investing is a critical part of building and
              preserving wealth. Every investment decision has potential tax
              implications, and without a coordinated strategy, unnecessary taxes
              can reduce long-term returns and limit the impact of your financial
              plan.
            </p>
            <p>
              At Keybase Financial Group, our advisors help structure investment
              strategies with tax efficiency in mind. By aligning your portfolio,
              income needs, retirement goals, and estate objectives, we help you
              make more informed decisions about where and how your money is
              invested.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- A Strategic Advantage ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Approach
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                A Strategic Advantage
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Tax planning should not begin at year-end. It should be built
                into your financial strategy from the start.
              </p>
              <p>
                Different types of investment income are taxed differently.
                Interest income, dividends, capital gains, registered
                investments, and tax-free accounts can each play a different role
                in your overall plan. A thoughtful approach can help reduce costs,
                improve after-tax returns, and support more efficient wealth
                accumulation over time.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Building and Preserving Wealth ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Long View
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Building and Preserving Wealth
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Tax-efficient investing is not only about reducing taxes today.
                It is about creating a stronger foundation for tomorrow.
              </p>
              <p>
                With the right strategy, investors can better manage taxable
                income, maximize registered account opportunities, preserve
                retirement assets, and support the future transfer of wealth to
                loved ones.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Tax-Efficient Planning Considerations ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                What We Consider
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Tax-Efficient Planning Considerations
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                Every plan is different. These are some of the areas our advisors
                review to build a strategy tailored to your goals.
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="grid border-t border-black/10 sm:grid-cols-2 sm:gap-x-14">
                {CONSIDERATIONS.map((item) => (
                  <li
                    key={item}
                    className="flex items-baseline gap-4 border-b border-black/10 py-[18px]"
                  >
                    <Check
                      className="relative top-[3px] h-[18px] w-[18px] flex-none text-[#006d6e]"
                      strokeWidth={2.25}
                    />
                    <span className="text-[17px] leading-snug text-[#1a2433]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Integrated Advice for Long-Term Goals ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Integrated Advice
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Advice for Long-Term Goals
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                A strong financial plan looks beyond investment performance alone.
                It considers how taxes, retirement income, estate planning, and
                long-term wealth preservation work together.
              </p>
              <p>
                Our advisors review your financial position and help identify
                tax-efficient strategies designed to support your retirement and
                estate planning objectives.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- CTA — Start the Conversation ---------- */}
      <section className="relative overflow-hidden border-t border-black/10 bg-[#0a1f33]">
        <img
          src="/tax-planning2.jpg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-3xl">
            <h2
              className="font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-white sm:text-[44px]"
              style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
            >
              Start the Conversation
            </h2>
            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85"
              style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
            >
              Tax efficiency can have a meaningful impact on your financial
              future. Speak with a Keybase Financial Advisor today to explore
              strategies that help you build, preserve, and transfer wealth with
              greater confidence.
            </p>
            <div className="mt-9">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e6f1f1] hover:shadow-xl"
              >
                Speak with an Advisor
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
