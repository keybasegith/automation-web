import { CalendarDays, Trophy } from "lucide-react";
import { BASE, EVENT } from "@/lib/world-cup/config";
import { LinkButton } from "./ui";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-black text-white">
      {/* hero photo */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/worldcup-challenge-hero.jpg')" }}
        aria-hidden
      />
      {/* black overlay to keep text legible over the photo */}
      <div
        className="pointer-events-none absolute inset-0 bg-black/70"
        aria-hidden
      />
      {/* subtle field / maple motif */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(200,16,46,0.5), transparent 35%), radial-gradient(circle at 85% 30%, rgba(255,255,255,0.15), transparent 30%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-gray-200">
          <CalendarDays className="h-3.5 w-3.5" />
          {EVENT.startDate} – {EVENT.endDate}
        </div>

        <h1 className="font-display mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          {EVENT.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-medium text-white sm:text-xl">
          {EVENT.tagline}
        </p>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-300">
          Join the challenge, support Team Canada, submit your predictions,
          follow the leaderboard, and celebrate the FIFA World Cup 2026 from{" "}
          {EVENT.startDate} to {EVENT.endDate}.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href={`${BASE}/register`} size="lg" variant="primary">
            <Trophy className="h-5 w-5" /> Join the Challenge
          </LinkButton>
          <LinkButton href={`${BASE}/leaderboard`} size="lg" variant="outline" className="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20">
            View Leaderboard
          </LinkButton>
          <LinkButton href={`${BASE}/rules`} size="lg" variant="ghost" className="!text-white hover:!bg-white/10">
            View Rules
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
