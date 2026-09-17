import Reveal from "@/components/home/Reveal";
import StatValue, { type StatValueProps } from "@/components/home/StatValue";

type Stat = StatValueProps & {
  label: string;
  note?: string;
};

// NOTE: Illustrative figures for layout. Replace with verified firm metrics before launch.
const STATS: Stat[] = [
  {
    prefix: "",
    value: 1989,
    suffix: "",
    grouping: false,
    label: "Year founded, advising Canadian families ever since",
  },
  {
    prefix: "$",
    value: 3,
    suffix: "B+",
    label: "Client assets under administration as of May 1, 2026",
    note: "Assets under administration reflect the total value of client accounts administered across Keybase advisors, including managed portfolios, registered plans, and insurance solutions held with the firm.",
  },
  {
    prefix: "",
    value: 100,
    suffix: "%",
    label: "Independent — advice aligned to your goals, not ours",
    note: "As an independent firm, Keybase advisors are free from product-sale quotas and proprietary mandates, recommending only what genuinely fits each client's circumstances and long-term objectives.",
  },
];

/**
 * Server component: the figures ship in the HTML. Only the count-up inside
 * <StatValue> and the scroll reveal around it run on the client.
 */
export default function StatsBand() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-y-12 px-5 pb-12 pt-20 sm:px-8 sm:pb-14 sm:pt-28 lg:grid-cols-3 lg:gap-x-16">
        {STATS.map((stat, i) => (
          <Reveal
            key={stat.label}
            delay={i * 120}
            className="lg:border-l lg:border-black/15 lg:pl-12"
          >
            <div className="font-serif text-6xl font-normal leading-none tracking-tight text-[#0a1f33] sm:text-7xl">
              <StatValue
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
                grouping={stat.grouping}
              />
            </div>
            <p className="mt-8 max-w-[260px] text-lg leading-snug text-[#5b6573]">
              {stat.label}
            </p>
            {stat.note && (
              <p className="mt-8 max-w-[300px] text-[15px] leading-relaxed text-[#7a828d]">
                {stat.note}
              </p>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
