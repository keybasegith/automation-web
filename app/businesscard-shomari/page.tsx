import type { Metadata } from "next";
import Image from "next/image";
import ShareButton from "./ShareButton";
import FlipCard from "./FlipCard";

/**
 * Financial Advisor digital business card.
 * Edit the `card` object below to update personal contact info.
 */
const card = {
  firstName: "Shomari",
  lastName: "Hutchinson",
  title: "Financial Advisor",
  company: "Keybase Financial Group",
  tagline: "Building and Preserving Personal Wealth",
  profilePhoto: "/shomari-profile1.jpg",
  backgroundPhoto: "/shomari-profile-background.jpg",
  companyLogo: "/keybaselogo-updated.png",
  social: {
    linkedin: "https://www.linkedin.com/company/keybase",
  },
  address: {
    line1: "1725 16th Avenue, Suite 101",
    line2: "Richmond Hill, ON L4B 0B3",
  },
  contact: {
    phone: "905-709-7911 Ext. 2231",
    tollFree: "1-888-539-4246",
    email: "shutchinson@keybase.com",
    website: "www.keybase.com",
  },
} as const;

const fullName = [card.firstName, card.lastName].filter(Boolean).join(" ");

export const metadata: Metadata = {
  title: `${fullName} — ${card.title}, ${card.company}`,
  description: `Digital business card for ${fullName}, ${card.title} at ${card.company}.`,
};

const KEYBASE_GREEN = "#006d6e";

export default function BusinessCardShomariPage() {
  const mailto = `mailto:${card.contact.email}`;
  const telHref = `tel:${card.contact.phone.replace(/[^+\d]/g, "")}`;
  const tollFreeHref = `tel:${card.contact.tollFree.replace(/[^+\d]/g, "")}`;
  const websiteHref = `https://${card.contact.website}`;

  const frontFace = (
    <article className="w-full overflow-hidden rounded-[22px] bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 sm:rounded-[28px]">
      {/* Top header: logo + address */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:gap-4 sm:px-5 sm:pt-5 sm:pb-3">
        <div className="relative h-14 w-32 flex-shrink-0 sm:h-20 sm:w-44">
          <Image
            src={card.companyLogo}
            alt={`${card.company} logo`}
            fill
            sizes="(max-width: 640px) 128px, 176px"
            className="object-contain object-left"
          />
        </div>
        <div className="flex items-center gap-1.5 text-right">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-3 w-3 flex-shrink-0 text-slate-900 sm:h-3.5 sm:w-3.5"
            fill="currentColor"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
          </svg>
          <div className="whitespace-nowrap text-[10.5px] leading-snug text-slate-700 sm:text-[12px]">
            <p>{card.address.line1}</p>
            <p>{card.address.line2}</p>
          </div>
        </div>
      </div>

      {/* Background + circular profile */}
      <div className="relative">
        <div className="relative h-[160px] w-full overflow-hidden bg-slate-100 sm:h-[220px]">
          <Image
            src={card.backgroundPhoto}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover"
          />
        </div>
        <div className="absolute left-1/2 -bottom-12 h-24 w-24 -translate-x-1/2 overflow-hidden rounded-full bg-white shadow-lg ring-4 ring-white sm:-bottom-16 sm:h-32 sm:w-32">
          <Image
            src={card.profilePhoto}
            alt={`${fullName} portrait`}
            fill
            sizes="(max-width: 640px) 96px, 128px"
            className="scale-150 object-cover"
            style={{ objectPosition: "50% 20%" }}
          />
        </div>
      </div>

      <div className="px-5 pt-16 pb-5 sm:px-7 sm:pt-20 sm:pb-7">
        {/* Name */}
        <h1 className="font-display text-center text-[22px] font-bold leading-tight tracking-tight text-slate-900 sm:text-[28px]">
          {fullName}
        </h1>

        {/* Title */}
        <p className="mt-1 text-center text-[12px] font-medium text-slate-600 sm:text-[14px]">
          {card.title}
        </p>

        {/* Tagline */}
        {card.tagline ? (
          <p className="mt-2 text-center text-[12px] leading-relaxed text-slate-500 sm:mt-3 sm:text-[13px]">
            {card.tagline}
          </p>
        ) : null}

        {/* Contact details */}
        <div className="mt-4 space-y-0.5 text-center text-[11px] leading-snug text-slate-600 sm:mt-5 sm:space-y-1 sm:text-[13px]">
          <p>
            <span className="text-slate-400">T:</span>{" "}
            <a href={telHref} className="hover:text-slate-900">
              {card.contact.phone}
            </a>{" "}
            <span className="text-slate-300">·</span>{" "}
            <span className="text-slate-400">TF:</span>{" "}
            <a href={tollFreeHref} className="hover:text-slate-900">
              {card.contact.tollFree}
            </a>
          </p>
          <p>
            <a href={mailto} className="hover:text-slate-900">
              {card.contact.email}
            </a>{" "}
            <span className="text-slate-300">·</span>{" "}
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900"
            >
              {card.contact.website}
            </a>
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
          <a
            href={mailto}
            className="block w-full rounded-xl bg-black px-4 py-2.5 text-center text-[13px] font-semibold text-white transition hover:bg-neutral-800 sm:py-3 sm:text-[14px]"
          >
            Email Me
          </a>
          <ShareButton
            fullName={fullName}
            title={card.title}
            company={card.company}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-center text-[13px] font-semibold text-slate-700 transition hover:bg-slate-200 sm:py-3 sm:text-[14px]"
          />
        </div>
      </div>
    </article>
  );

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-100 px-3 py-4 sm:px-4 sm:py-12">
      <FlipCard
        front={frontFace}
        fullName={fullName}
        title={card.title}
        company={card.company}
        accentColor={KEYBASE_GREEN}
      />
    </main>
  );
}
