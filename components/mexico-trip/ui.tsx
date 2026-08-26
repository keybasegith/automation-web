import type { ReactNode } from "react";

/**
 * Shared primitives for the Playa del Carmen landing page.
 *
 * Design language: coastal editorial. Airy cool-white bands, dark-navy ink
 * type and bands, hairline rules, small-caps tracking labels, teal detail
 * accents, and a single solid coral CTA — no gradients on text or buttons, so
 * the page reads like a resort brochure rather than a template.
 */

export const INK = "#0B2237";
export const SEA = "#0A7A8C";
export const AQUA = "#35C9C9";
export const MIST = "#F3F7FB";
export const MIST_TINT = "#E8F0F8";
/** Buttons and graphic accents. */
export const CORAL = "#F0543C";
/** Coral tuned darker for text-sized accents so contrast holds on white. */
export const CORAL_TEXT = "#C93A24";
export const SUNSHINE = "#FFCB45";

/** The one dark band treatment (hero fallback + RSVP section): deep navy. */
export const SEA_GRADIENT =
  "linear-gradient(170deg, #081A2E 0%, #0D2A4A 60%, #123A63 100%)";

/** Small-caps section label. */
export function Eyebrow({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.3em] sm:text-xs ${
        tone === "dark" ? "text-[#7FD6DD]" : "text-[#0A7A8C]"
      }`}
    >
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  tone = "light",
  align = "center",
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  tone?: "dark" | "light";
  align?: "center" | "left";
}) {
  const centered = align === "center";
  return (
    <div className={`max-w-2xl ${centered ? "mx-auto text-center" : ""}`}>
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <h2
        className={`font-franklin font-display mt-4 text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl ${
          tone === "dark" ? "text-white" : "text-[#0B2237]"
        }`}
      >
        {title}
      </h2>
      {sub && (
        <p
          className={`mt-4 text-base leading-relaxed ${
            tone === "dark" ? "text-white/70" : "text-[#0B2237]/60"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/** Primary action — solid coral, sentence case. */
export function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#F0543C] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(240,84,60,0.32)] transition hover:bg-[#DE472F] hover:shadow-[0_10px_28px_rgba(240,84,60,0.4)] ${className}`}
    >
      {children}
    </a>
  );
}

/** Thin rule used to open editorial sections. */
export function Rule({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-[#0B2237]/12 ${className}`} aria-hidden />;
}
