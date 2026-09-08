"use client";

import { useEffect, useRef, useState } from "react";

import { trackClientEvent } from "@/lib/keybase-answer/client-analytics";

/**
 * The Keybase Answer ambient composition.
 *
 * Many separate pieces of financial knowledge — passages, figures, published
 * commentary — travelling slowly around one central node that draws them
 * together. Three orbits at three speeds give the depth; the objects
 * counter-rotate so they stay upright as they travel; the dashed spokes carry
 * evidence inward. Nothing moves fast enough to pull the eye off the copy
 * beside it.
 *
 * Implementation notes, because the constraint here is the homepage:
 *
 *   - It is one inline SVG with CSS keyframes. No canvas, no WebGL, no
 *     animation library, no image or video to download, and no per-frame
 *     JavaScript. Everything animates on transform, opacity, or dash offset,
 *     so the whole composition stays on the compositor.
 *   - Motion is held until the section scrolls into view, so a visitor who
 *     never reaches it never pays for it.
 *   - The keyframes live in app/globals.css alongside the rest of the site's
 *     motion system, which is also where prefers-reduced-motion collapses them.
 *     Under reduced motion this becomes a still composition, not a frozen one:
 *     the objects are placed where the artwork wants them.
 */

/** One knowledge object on an orbit. */
interface OrbitObject {
  x: number;
  y: number;
  kind: "sphere" | "card" | "chart" | "dot";
  /** Radius or half-size, in viewBox units. */
  size: number;
  opacity: number;
}

interface Orbit {
  radius: number;
  /** Seconds for one revolution. Long, and mutually prime-ish, so the
      composition never repeats a configuration the eye can learn. */
  duration: number;
  reverse?: boolean;
  objects: OrbitObject[];
}

const ORBITS: Orbit[] = [
  {
    radius: 96,
    duration: 78,
    objects: [
      { x: 396, y: 300, kind: "sphere", size: 17, opacity: 0.95 },
      { x: 238, y: 374, kind: "chart", size: 15, opacity: 0.8 },
      { x: 259, y: 213, kind: "dot", size: 5, opacity: 0.75 },
    ],
  },
  {
    radius: 168,
    duration: 112,
    reverse: true,
    objects: [
      { x: 429, y: 408, kind: "card", size: 22, opacity: 0.92 },
      { x: 216, y: 446, kind: "sphere", size: 13, opacity: 0.7 },
      { x: 148, y: 229, kind: "sphere", size: 23, opacity: 0.85 },
      { x: 384, y: 155, kind: "dot", size: 6, opacity: 0.6 },
    ],
  },
  {
    radius: 238,
    duration: 152,
    objects: [
      { x: 530, y: 362, kind: "sphere", size: 11, opacity: 0.55 },
      { x: 94, y: 419, kind: "card", size: 17, opacity: 0.6 },
      { x: 279, y: 63, kind: "chart", size: 13, opacity: 0.5 },
    ],
  },
];

/** Fixed spokes, under the orbits — the path evidence takes to the centre. */
const SPOKE_ANGLES = [18, 74, 137, 199, 256, 318];

function spoke(angle: number, from: number, to: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x1: 300 + from * Math.cos(radians),
    y1: 300 + from * Math.sin(radians),
    x2: 300 + to * Math.cos(radians),
    y2: 300 + to * Math.sin(radians),
  };
}

function KnowledgeObject({ object }: { object: OrbitObject }) {
  const { x, y, size, opacity, kind } = object;
  switch (kind) {
    case "sphere":
      return (
        <g opacity={opacity}>
          <circle cx={x} cy={y} r={size} fill="url(#kaSphere)" />
          <circle
            cx={x}
            cy={y}
            r={size}
            fill="none"
            stroke="#006d6e"
            strokeOpacity="0.28"
            strokeWidth="1"
          />
          {/* The highlight is what makes a flat circle read as a form. */}
          <ellipse
            cx={x - size * 0.32}
            cy={y - size * 0.36}
            rx={size * 0.34}
            ry={size * 0.24}
            fill="#ffffff"
            fillOpacity="0.5"
          />
        </g>
      );
    case "card":
      return (
        <g opacity={opacity}>
          <rect
            x={x - size}
            y={y - size * 0.72}
            width={size * 2}
            height={size * 1.44}
            rx={size * 0.34}
            fill="#ffffff"
            fillOpacity="0.86"
            stroke="#006d6e"
            strokeOpacity="0.22"
            strokeWidth="1"
          />
          <g stroke="#0a1f33" strokeOpacity="0.3" strokeWidth="1.4" strokeLinecap="round">
            <path d={`M${x - size * 0.55} ${y - size * 0.2}h${size * 1.1}`} />
            <path d={`M${x - size * 0.55} ${y + size * 0.22}h${size * 0.66}`} />
          </g>
        </g>
      );
    case "chart":
      return (
        <g opacity={opacity}>
          <circle cx={x} cy={y} r={size} fill="#e6f1f1" fillOpacity="0.9" />
          <g stroke="#006d6e" strokeWidth="2" strokeLinecap="round">
            <path d={`M${x - size * 0.45} ${y + size * 0.4}v${-size * 0.42}`} />
            <path d={`M${x} ${y + size * 0.4}v${-size * 0.78}`} />
            <path d={`M${x + size * 0.45} ${y + size * 0.4}v${-size * 0.58}`} />
          </g>
        </g>
      );
    default:
      return <circle cx={x} cy={y} r={size} fill="#5ed3c6" opacity={opacity} />;
  }
}

export default function KeybaseAnswerVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [showControl, setShowControl] = useState(false);

  // Hold the animation until the composition is on screen, and count the
  // homepage impression the first time it gets there.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      // Nothing to gate on, so simply run. Deferred out of the effect body
      // because React asks that an effect not set state synchronously.
      const timer = setTimeout(() => {
        setInView(true);
        trackClientEvent("keybase_answer_home_impression");
      }, 0);
      return () => clearTimeout(timer);
    }
    let counted = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0].isIntersecting;
        setInView(visible);
        if (visible && !counted) {
          counted = true;
          trackClientEvent("keybase_answer_home_impression");
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The control is offered only where there is motion to control. Mounting it
  // client-side also keeps it out of the no-JavaScript render, where it could
  // not work.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setShowControl(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const running = inView && !paused;

  return (
    <div
      ref={containerRef}
      data-motion={running ? "running" : "paused"}
      className="relative aspect-square w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-[#f3f9f9] via-white to-[#eef5f6]"
    >
      <svg
        viewBox="0 0 600 600"
        className="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="kaSphere" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#a8dcd8" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#006d6e" stopOpacity="0.42" />
          </radialGradient>
          <radialGradient id="kaCore" cx="42%" cy="36%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="55%" stopColor="#5ed3c6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#006d6e" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="kaWashA" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5ed3c6" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#5ed3c6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="kaWashB" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a1f33" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#0a1f33" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient wash. */}
        <circle className="ka-drift-a" cx="180" cy="200" r="230" fill="url(#kaWashA)" />
        <circle className="ka-drift-b" cx="430" cy="420" r="250" fill="url(#kaWashB)" />

        {/* Orbit paths. Faint enough to be structure, not decoration. */}
        {ORBITS.map((orbit) => (
          <circle
            key={`ring-${orbit.radius}`}
            cx="300"
            cy="300"
            r={orbit.radius}
            fill="none"
            stroke="#0a1f33"
            strokeOpacity="0.09"
            strokeWidth="1"
          />
        ))}

        {/* Evidence travelling inward. */}
        <g stroke="#006d6e" strokeOpacity="0.3" strokeWidth="1.1" strokeLinecap="round">
          {SPOKE_ANGLES.map((angle) => {
            const line = spoke(angle, 46, 262);
            return (
              <line
                key={angle}
                {...line}
                strokeDasharray="3 9"
                className="ka-flow"
                style={{ animationDuration: `${7 + (angle % 5)}s` }}
              />
            );
          })}
        </g>

        {/* The node the answer forms at. */}
        <g className="ka-breathe">
          <circle cx="300" cy="300" r="58" fill="#5ed3c6" fillOpacity="0.1" />
          <circle cx="300" cy="300" r="40" fill="#5ed3c6" fillOpacity="0.16" />
          <circle cx="300" cy="300" r="27" fill="url(#kaCore)" />
          <circle
            cx="300"
            cy="300"
            r="27"
            fill="none"
            stroke="#006d6e"
            strokeOpacity="0.4"
            strokeWidth="1.2"
          />
        </g>

        {/* The knowledge objects. */}
        {ORBITS.map((orbit) => (
          <g
            key={`orbit-${orbit.radius}`}
            className={orbit.reverse ? "ka-orbit-reverse" : "ka-orbit"}
            style={{ animationDuration: `${orbit.duration}s` }}
          >
            {orbit.objects.map((object, i) => (
              <g
                key={`${orbit.radius}-${i}`}
                className={orbit.reverse ? "ka-counter-reverse" : "ka-counter"}
                style={{ animationDuration: `${orbit.duration}s` }}
              >
                <KnowledgeObject object={object} />
              </g>
            ))}
          </g>
        ))}
      </svg>

      {showControl && (
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border border-[#0a1f33]/12 bg-white/85 text-[#0a1f33] shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e] sm:bottom-6 sm:right-6"
        >
          <span className="sr-only">
            {paused ? "Play the Keybase Answer animation" : "Pause the Keybase Answer animation"}
          </span>
          {/* Original glyphs, drawn to the same weight as the mark. */}
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            {paused ? (
              <path d="M3 1.6v10.8L12.2 7 3 1.6z" fill="currentColor" />
            ) : (
              <g fill="currentColor">
                <rect x="2.6" y="1.8" width="3.1" height="10.4" rx="1" />
                <rect x="8.3" y="1.8" width="3.1" height="10.4" rx="1" />
              </g>
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
