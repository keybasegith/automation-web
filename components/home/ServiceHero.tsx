import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import type { ServicePageContent } from "@/lib/cms/types";

/**
 * Per-page scrim gradient (a design detail, not editable content). Each service
 * page passes its own value; this map lets the admin live-preview reproduce the
 * exact same gradient for a given slug.
 */
export const SERVICE_SCRIM: Record<string, string> = {
  "education-planning": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent",
  "estate-planning": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent",
  "retirement-planning": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent",
  "tax-planning": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent",
  "wealth-building": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/45 via-[#0a1f33]/15 to-transparent",
  "non-registered-investments": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/70 via-[#0a1f33]/35 to-transparent",
  rdsp: "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent",
  resp: "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent",
  rrsp: "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent",
  tfsa: "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/45 to-transparent",
  fhsa: "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/50 to-transparent",
  "traditional-investments": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/45 to-transparent",
  "alternative-investments": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/45 to-transparent",
  insurance: "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/70 via-[#0a1f33]/25 to-transparent",
  "travel-insurance": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/80 via-[#0a1f33]/40 to-transparent",
  "segregated-funds": "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/85 via-[#0a1f33]/45 to-transparent",
};

export function serviceScrim(slug: string): string {
  return (
    SERVICE_SCRIM[slug] ??
    "pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1f33]/70 via-[#0a1f33]/30 to-transparent"
  );
}

/**
 * Per-page hero band height. Only pages that needed a shorter band appear here;
 * everything else uses the component's default.
 */
const SERVICE_HERO_PADDING: Record<string, string> = {
  "wealth-building": "py-14 sm:py-16",
  "alternative-investments": "py-14 sm:py-16",
};

export function serviceHeroPadding(slug: string): string | undefined {
  return SERVICE_HERO_PADDING[slug];
}

/**
 * Per-page hero framing. Only pages whose photo needs a closer crop appear
 * here; everything else uses the default push-in.
 */
const SERVICE_HERO_FRAMING: Record<string, string> = {
  "wealth-building": "ken-burns-close",
};

export function serviceHeroFraming(slug: string): string | undefined {
  return SERVICE_HERO_FRAMING[slug];
}

/**
 * Shared hero for every "Our Services" page. Renders the exact markup the pages
 * previously duplicated inline (dark band → ken-burns background image →
 * gradient scrim → breadcrumb → eyebrow → heading → intro → CTA), now driven by
 * CMS content so staff can edit the headline copy, image, and CTA.
 *
 * `scrimClassName` stays a per-page prop (a design detail, not content) so each
 * page keeps its exact background-image legibility gradient. `paddingClassName`
 * is the same kind of prop: pages whose copy runs long can dial the band down
 * from the default height without affecting every other service page.
 */
export default function ServiceHero({
  content,
  scrimClassName,
  paddingClassName = "py-20 sm:py-28",
  framingClassName = "ken-burns",
}: {
  content: ServicePageContent;
  scrimClassName: string;
  paddingClassName?: string;
  /** Replaces the default push-in animation — see serviceHeroFraming(). */
  framingClassName?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-black/10 bg-[#0a1f33] text-white">
      {/* Raw <img> (not next/image): a full-bleed ken-burns background layer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={content.heroImage}
        alt=""
        aria-hidden
        className={`${framingClassName} pointer-events-none absolute inset-0 h-full w-full object-cover`}
      />
      {/* light left-side scrim keeps the copy legible without darkening the image */}
      <div className={scrimClassName} aria-hidden />

      <div
        className={`relative mx-auto max-w-[1280px] px-5 sm:px-8 ${paddingClassName}`}
      >
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-[14px] text-white/70"
        >
          <Link href="/" className="transition-colors hover:text-white">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-white/40" />
          <Link href="/#what-we-do" className="transition-colors hover:text-white">
            {content.eyebrow}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-white/40" />
          <span className="text-white">{content.breadcrumbLabel}</span>
        </nav>

        <p className="mt-9 text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">
          {content.eyebrow}
        </p>
        <h1
          className="mt-5 max-w-3xl font-serif text-[42px] font-normal leading-[1.06] tracking-tight sm:text-[60px]"
          style={{ textShadow: "0 2px 28px rgba(0,0,0,0.5)" }}
        >
          {content.heading}
        </h1>
        <p
          className="mt-7 max-w-2xl text-lg leading-relaxed text-white/85"
          style={{ textShadow: "0 1px 16px rgba(0,0,0,0.5)" }}
        >
          {content.intro}
        </p>
        {content.ctaLabel && (
          <div className="mt-10">
            <Link
              href={content.ctaUrl || "/contact"}
              className="group inline-flex items-center gap-2 bg-white px-7 py-4 text-[15px] font-semibold text-[#0a1f33] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e6f1f1] hover:shadow-xl hover:shadow-black/20"
            >
              {content.ctaLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
