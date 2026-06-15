import {
  Users,
  Globe,
  HeartHandshake,
  ShieldCheck,
  TrendingUp,
  CalendarClock,
  ClipboardList,
  Award,
} from "lucide-react";
import { BASE, EVENT, POOL_SPLIT, POOL_DISCLAIMER } from "@/lib/world-cup/config";
import { HeroSection } from "@/components/world-cup/HeroSection";
import { InfoCard, PrizeCard } from "@/components/world-cup/cards";
import { Alert, Card, LinkButton } from "@/components/world-cup/ui";
import { Maple } from "@/components/world-cup/icons";

function SectionHeading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <p className="text-sm font-bold uppercase tracking-wider text-[#C8102E]">{eyebrow}</p>}
      <h2 className="font-display mt-2 text-3xl font-black text-[#0B1F3A] sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-base leading-relaxed text-gray-600">{sub}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      <HeroSection />

      {/* About */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="About the Challenge"
          title="A friendly prediction challenge celebrating Canadian pride"
          sub="The Argosy / Keybase World Cup Challenge 2026 is a friendly prediction challenge created to celebrate the FIFA World Cup and Canadian pride. Participants can submit match predictions, earn points, follow daily leaderboard updates, and compete for special prizes throughout the tournament."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <InfoCard icon={ClipboardList} title="Submit predictions">
            Predict scores for every match before kickoff. Earn points for correct
            results, goal differences, and exact scores.
          </InfoCard>
          <InfoCard icon={TrendingUp} title="Climb the leaderboard">
            Points update as official results are entered. Follow daily standings
            and see how you stack up against your colleagues.
          </InfoCard>
          <InfoCard icon={Award} title="Win special prizes">
            Take on the Canada Pride Challenge and the Ultimate Final Prediction
            for a shot at exclusive prizes.
          </InfoCard>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Supporting Team Canada"
            title="Stronger Together"
            sub="This challenge celebrates Canadian values including teamwork, diversity, resilience, and inclusion."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon={Users} title="Teamwork">
              Compete together and celebrate the tournament as one community.
            </InfoCard>
            <InfoCard icon={Globe} title="Diversity">
              A global game that brings every background and team together.
            </InfoCard>
            <InfoCard icon={ShieldCheck} title="Resilience">
              Every match is a fresh chance to climb the standings.
            </InfoCard>
            <InfoCard icon={HeartHandshake} title="Inclusion">
              Everyone is welcome — no soccer expertise required.
            </InfoCard>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="How it works" title="Four simple steps" />
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {[
            { n: 1, t: "Register", d: "Create your participant account with your name, company, and favorite team." },
            { n: 2, t: "Predict", d: "Submit score predictions for matches before they kick off." },
            { n: 3, t: "Earn points", d: "Points are awarded automatically as admins enter official results." },
            { n: 4, t: "Follow along", d: "Track the leaderboard and daily updates through to the final." },
          ].map((s) => (
            <Card key={s.n} className="h-full">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B1F3A] text-base font-black text-white">
                {s.n}
              </span>
              <h3 className="mt-3 font-bold text-[#0B1F3A]">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.d}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* World Cup Pool */}
      <section className="bg-[#0B1F3A] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-[#ff8fa0]">World Cup Pool</p>
            <h2 className="font-display mt-2 text-3xl font-black sm:text-4xl">
              ${EVENT.entryFee} entry · top four share the pool
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-300">
              Participation includes a ${EVENT.entryFee} entry fee per participant.
              The total collected participant pool is intended to be distributed to
              the top four leaderboard participants after the tournament.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            {POOL_SPLIT.map((p) => (
              <div key={p.place} className="rounded-2xl bg-white/5 p-5 text-center ring-1 ring-white/10">
                <p className="text-3xl font-black text-white">{p.pct}%</p>
                <p className="mt-1 text-sm text-gray-300">{p.place}</p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Alert tone="warning" title="Important — internal & legal review required">
              {POOL_DISCLAIMER}
            </Alert>
          </div>
        </div>
      </section>

      {/* Prizes */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="Special prizes" title="More ways to win" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <PrizeCard eyebrow="Canada Pride Challenge" title="Canada Soccer shirts" accent>
            <p className="mb-2 inline-flex items-center gap-1.5 font-medium text-[#C8102E]">
              <Maple className="h-4 w-4" /> 5 winners
            </p>
            <p>
              Five winners receive a Canada Soccer shirt by predicting Team Canada’s
              group-stage results, total goals scored, and total goals conceded.
            </p>
          </PrizeCard>
          <PrizeCard eyebrow="Ultimate Final Prediction" title="Grand prize">
            Predict the two teams in the final. The grand prize is{" "}
            <strong className="text-[#0B1F3A]">4 tickets to an upcoming Toronto FC game</strong>.
          </PrizeCard>
          <PrizeCard eyebrow="Ultimate Final Prediction" title="Runner-up prize">
            The runner-up receives an{" "}
            <strong className="text-[#0B1F3A]">invitation to play golf at a prestigious GTA golf course</strong>.
          </PrizeCard>
        </div>
      </section>

      {/* Daily tracker */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C8102E]/10 text-[#C8102E]">
            <CalendarClock className="h-6 w-6" />
          </span>
          <h2 className="font-display mt-4 text-3xl font-black text-[#0B1F3A]">Daily match tracker</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            The challenge includes a daily match tracker and leaderboard update
            throughout the tournament, with optional weekly recap posts to highlight
            top participants, Canada Pride moments, and major leaderboard changes.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href={`${BASE}/tracker`} variant="secondary">
              Open the Daily Tracker
            </LinkButton>
            <LinkButton href={`${BASE}/leaderboard`} variant="outline">
              View Leaderboard
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-[#C8102E] to-[#a50d26] px-6 py-12 text-center text-white sm:px-12">
          <h2 className="font-display text-3xl font-black sm:text-4xl">Ready to join the challenge?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Register today, submit your predictions, and celebrate the FIFA World
            Cup 2026 with your colleagues — Stronger Together.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkButton href={`${BASE}/register`} size="lg" variant="secondary">
              Join the Challenge
            </LinkButton>
            <LinkButton
              href={`${BASE}/rules`}
              size="lg"
              variant="outline"
              className="!border-white/40 !bg-white/10 !text-white hover:!bg-white/20"
            >
              View Rules
            </LinkButton>
          </div>
        </div>
      </section>
    </div>
  );
}
