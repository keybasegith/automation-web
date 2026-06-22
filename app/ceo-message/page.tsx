import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";

export const metadata = {
  title: "A Message from our CEO — Keybase Financial Group",
  description:
    "A personal message from Dax Sukhraj, President & CEO of Keybase Financial Group, on the firm's philosophy and its promise to every client.",
};

export default function CeoMessagePage() {
  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="border-b border-black/10 bg-[#0a1f33] text-white">
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/60">
            From the Office of the CEO
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]">
            A message from our CEO.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/75">
            On what guides Keybase Financial Group — and the promise we make to
            every client who places their trust in us.
          </p>
        </div>
      </section>

      {/* ---------- Letter ---------- */}
      <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-[300px_1fr] lg:gap-16">
          {/* Portrait + identity */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-lg bg-[#eaeef2]">
              <img
                src="/dax-profile-updated.jpg"
                alt="Dax Sukhraj, President & CEO"
                className="aspect-[4/5] w-full object-cover object-top"
              />
            </div>
            <h2 className="mt-6 font-serif text-2xl font-normal text-[#0a1f33]">
              Dax Sukhraj
            </h2>
            <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#006d6e]">
              President &amp; Chief Executive Officer
            </p>
          </aside>

          {/* Letter body */}
          <div className="max-w-2xl">
            <p className="font-serif text-[26px] font-normal leading-snug text-[#0a1f33] sm:text-[30px]">
              When we founded Keybase, we set out to build the kind of firm we
              would want advising our own families.
            </p>

            <div className="mt-8 space-y-6 text-lg leading-relaxed text-[#5b6573]">
              <p>
                To the clients, partners, and communities we are privileged to
                serve — thank you. Your trust is the foundation of everything we
                do, and we never take it for granted.
              </p>
              <p>
                The financial industry has no shortage of products, pitches, and
                noise. What it too often lacks is genuine independence — advice
                offered without competing incentives, and a partner whose success
                is measured by yours. That gap is exactly why Keybase exists. We
                are proudly independent, which means our counsel is shaped by one
                question and one question only: what is right for you.
              </p>
              <p>
                Our work is grounded in three commitments. First, we listen
                before we advise — because no strategy matters until we
                understand your goals, your circumstances, and the people you are
                planning for. Second, we bring institutional discipline to deeply
                personal relationships, pairing rigorous research with the
                patience to stay the course through every market cycle. And
                third, we remain transparent in everything — clear about our
                fees, honest in our guidance, and accountable for our advice.
              </p>
              <p>
                The world will keep changing — markets will rise and fall, rates
                will shift, and new challenges will emerge. Through all of it,
                our promise stays the same: to be the steady, independent partner
                who helps you build, protect, and pass on what you have worked so
                hard to create.
              </p>
              <p>
                On behalf of our entire team, thank you for allowing us to be part
                of your journey. We are honored by your confidence, and we are
                committed to earning it every single day.
              </p>
            </div>

            {/* Signature */}
            <div className="mt-12 border-t border-black/10 pt-8">
              <p className="font-serif text-[28px] font-normal italic text-[#0a1f33]">
                Dax Sukhraj
              </p>
              <p className="mt-2 text-[15px] text-[#5b6573]">
                President &amp; Chief Executive Officer, Keybase Financial Group
              </p>
            </div>

            {/* CTA */}
            <div className="mt-12 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-[#0a1f33] px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#0e2a45]"
              >
                Speak with an Advisor
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/key-executives"
                className="inline-flex items-center gap-2 border border-[#1a2433] px-7 py-4 text-[15px] font-semibold text-[#1a2433] transition-colors hover:bg-[#1a2433] hover:text-white"
              >
                Meet our Leadership
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
