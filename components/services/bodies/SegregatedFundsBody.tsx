import {
  Check,
  TrendingUp,
  ShieldCheck,
  ScrollText,
  Lock,
  Layers,
} from "lucide-react";
import Reveal from "@/components/home/Reveal";

/* What sets segregated funds apart from mutual funds. */
const FEATURES = [
  "Maturity Guarantees",
  "Death Benefit Guarantees",
  "Beneficiary Designations",
  "Estate Planning Advantages",
];

/* The core benefits. */
const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Investment Growth Potential",
    body: "Access market-based investment opportunities across different asset classes and strategies.",
  },
  {
    icon: ShieldCheck,
    title: "Maturity & Death Benefit Guarantees",
    body: "Many contracts offer guarantees that can help protect a portion of the money invested, either at maturity or upon death.",
  },
  {
    icon: ScrollText,
    title: "Estate Planning Advantages",
    body: "With a named beneficiary, proceeds may pass directly to beneficiaries — helping simplify estate settlement and potentially reducing delays.",
  },
  {
    icon: Lock,
    title: "Potential Creditor Protection",
    body: "In certain circumstances, segregated funds may offer creditor protection, depending on the contract structure and applicable laws.",
  },
  {
    icon: Layers,
    title: "Diversification",
    body: "Help diversify an investment portfolio while adding a layer of insurance-based protection.",
  },
];

/* Who segregated funds may suit. */
const USES = [
  "Build long-term wealth",
  "Protect a portion of invested capital",
  "Support estate planning goals",
  "Create retirement income options",
  "Add insurance features to an investment strategy",
];

/**
 * The segregated-funds page body — every section below the hero.
 *
 * Lives apart from the route so both the standalone /segregated-funds page and the
 * tabbed /services/segregated-funds view render exactly the same content.
 */
export default function SegregatedFundsBody() {
  return (
    <>
      {/* ---------- Overview ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Overview
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Investing, Plus Insurance
            </h2>
          </Reveal>
          <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
            <p>
              Like mutual funds, segregated funds can provide exposure to a
              diversified portfolio of investments. What makes them different is
              that they may include insurance-based features not found in a typical
              fund:
            </p>
            <ul className="flex flex-wrap gap-2.5 pt-1">
              {FEATURES.map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#f7f9fa] px-4 py-2 text-[14px] font-medium text-[#1a2433]"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#006d6e]" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------- How Segregated Funds Work ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                The Mechanics
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                How Segregated Funds Work
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                Segregated funds let you participate in the financial markets while
                adding a layer of protection through insurance-based guarantees.
              </p>
            </Reveal>

            <Reveal delay={120} className="space-y-6">
              <div className="rounded-sm border border-black/10 bg-white p-8 sm:p-9">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <p className="mt-6 font-serif text-[48px] font-normal leading-none tracking-tight text-[#0a1f33] sm:text-[54px]">
                  75%&ndash;100%
                </p>
                <p className="mt-3 text-[16px] leading-relaxed text-[#5b6573]">
                  Depending on the contract, segregated funds may guarantee 75% to
                  100% of eligible deposits at maturity or upon death.
                </p>
              </div>
              <p className="text-[16px] leading-relaxed text-[#5b6573]">
                Some contracts may also offer{" "}
                <span className="font-semibold text-[#1a2433]">reset features</span>,
                allowing investors to lock in market gains and potentially increase
                the guaranteed amount over time.
              </p>
              <p className="border-l-2 border-black/15 pl-5 text-[14px] leading-relaxed text-[#5b6573]">
                Because of these additional features, segregated funds may have
                higher fees than traditional mutual funds.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Key Benefits ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              Key Benefits
            </p>
            <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
              Market Access, Built-In Safeguards
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-sm border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((item, i) => (
              <Reveal
                key={item.title}
                delay={(i % 3) * 90}
                className="flex flex-col bg-white p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f1f1] text-[#006d6e]">
                  <item.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 text-[19px] font-semibold leading-snug text-[#0a1f33]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#5b6573]">
                  {item.body}
                </p>
              </Reveal>
            ))}

            {/* Planning uses — fills the sixth cell of the grid */}
            <Reveal delay={180} className="flex flex-col bg-[#0a1f33] p-8 text-white">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Planning Uses
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-white/80">
                May suit investors who want market participation while also
                prioritizing protection, estate planning, or retirement income.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Planning Uses (suitability) ---------- */}
      <section className="border-t border-black/10 bg-[#f7f9fa]">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Who They May Suit
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                Common Planning Goals
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[#5b6573]">
                Segregated funds may be considered by individuals looking to:
              </p>
            </Reveal>

            <Reveal delay={120}>
              <ul className="grid border-t border-black/10 sm:grid-cols-2 sm:gap-x-14">
                {USES.map((item) => (
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

      {/* ---------- The Keybase Difference ---------- */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-20">
            <Reveal>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
                Choosing Wisely
              </p>
              <h2 className="mt-4 font-serif text-[36px] font-normal leading-[1.1] tracking-tight text-[#0a1f33] sm:text-[44px]">
                The Keybase Difference
              </h2>
            </Reveal>
            <Reveal delay={120} className="space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                Segregated funds can be a valuable planning tool, but they should be
                selected carefully based on your goals, risk tolerance, time
                horizon, and need for insurance protection.
              </p>
              <p>
                A Keybase advisor can help you understand how segregated funds work
                and determine whether they fit within your overall financial plan.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

    </>
  );
}
