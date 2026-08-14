"use client";

import { useSyncExternalStore } from "react";
import { TRIP } from "@/lib/mexico-trip/config";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

const UNITS: Array<{ key: keyof Remaining; label: string }> = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
];

/**
 * A single shared clock, read through useSyncExternalStore.
 *
 * The snapshot has to be stable between ticks (React compares it on every
 * render), so the current second is cached here rather than read from
 * Date.now() inside getSnapshot. 0 is the "no clock yet" sentinel: it is what
 * the server renders and what the client hydrates with, which keeps the first
 * paint identical on both sides.
 */
let currentSecond = 0;

function subscribe(onChange: () => void) {
  const tick = () => {
    const second = Math.floor(Date.now() / 1000);
    if (second === currentSecond) return;
    currentSecond = second;
    onChange();
  };
  tick();
  // Sub-second polling so the display flips close to the real second boundary.
  const id = setInterval(tick, 250);
  return () => clearInterval(id);
}

const getSnapshot = () => currentSecond;
const getServerSnapshot = () => 0;

function remainingAt(second: number, targetMs: number): Remaining | null {
  if (second === 0) return null;
  const totalSeconds = Math.max(0, Math.floor((targetMs - second * 1000) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}

/**
 * Days-to-departure counter, drawn as frameless columns behind hairline
 * dividers — quiet enough to sit inside the hero without competing with it.
 * Placeholders hold the layout until the client clock starts.
 */
export function Countdown({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const second = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const target = new Date(`${TRIP.startDate}T00:00:00`).getTime();
  const left = remainingAt(second, target);

  const digits = tone === "dark" ? "text-white" : "text-[#0B2237]";
  const caption = tone === "dark" ? "text-white/50" : "text-[#0B2237]/45";
  const divider = tone === "dark" ? "divide-white/20" : "divide-[#0B2237]/12";

  return (
    <div
      className={`grid grid-cols-4 divide-x ${divider}`}
      role="timer"
      aria-live="off"
    >
      {UNITS.map((unit) => (
        <div key={unit.key} className="px-3 text-center first:pl-0 last:pr-0 sm:px-5">
          <div
            className={`font-franklin text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl ${digits}`}
          >
            {left ? String(left[unit.key]).padStart(2, "0") : "––"}
          </div>
          <div
            className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${caption}`}
          >
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}
