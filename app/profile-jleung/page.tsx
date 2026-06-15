import type { Metadata } from "next";
import Image from "next/image";

/**
 * Financial advisor portfolio landing page (linked from email signature).
 *
 * Everything below is driven by the `profile` object — edit it to update copy,
 * metrics, the aspiration message, and the Keybase company description.
 */
const profile = {
  firstName: "Johnathan",
  lastName: "Leung",
  title: "Financial Advisor",
  company: "Keybase Financial Group",
  tagline: "Building and Preserving Personal Wealth",
  // Practice focus areas shown under the name in the hero.
  specialties: "Wealth Management · Retirement & Estate Planning · Investment Strategy",
  profilePhoto: "/johnathan-profile1.jpg",
  companyLogo: "/keybase-logo-nobg.png",
  address: {
    line1: "1725 16th Avenue, Suite 101",
    line2: "Richmond Hill, ON L4B 0B3",
  },
  contact: {
    phone: "905-709-7911 Ext. 2222",
    cell: "647-242-7524",
    email: "jleung@keybase.com",
  },
  // Edit these to reflect Johnathan's real numbers.
  metrics: [
    { value: "15+", label: "Years of Experience" },
    { value: "500+", label: "Clients & Families Served" },
    { value: "$250M+", label: "Assets Under Management" },
    { value: "98%", label: "Client Retention Rate" },
  ],
  // A short, personal first-person message from Johnathan (one entry per line).
  aspirationLines: [
    "My goal is simple: to help every client and their family achieve true financial confidence.",
    "I believe wealth is not just about numbers on a statement — it is about the freedom",
    "to live well today and the peace of mind that the people you love are protected tomorrow.",
    "I am committed to building lasting, honest relationships and",
    "to treating your goals as if they were my own.",
  ],
  // Placeholder — replace with the official Keybase company description when ready (one entry per line).
  companyDescriptionLines: [
    "Keybase Financial Group is a full-service financial firm dedicated to helping",
    "individuals, families, and business owners build and preserve personal",
    "wealth. Through tailored planning, disciplined investing, and a",
    "relationship-first approach, our advisors deliver guidance you can trust",
    "at every stage of life.",
  ],
} as const;

const fullName = `${profile.firstName} ${profile.lastName}`;
const BRAND = "#006d6e";
const GOLD = "#c8a96a";

export const metadata: Metadata = {
  title: `${fullName} — ${profile.title}, ${profile.company}`,
  description: `${fullName}, ${profile.title} at ${profile.company}. ${profile.tagline}.`,
};

export default function ProfileJleungPage() {
  const mailto = `mailto:${profile.contact.email}`;
  // Show ONE phone number: Office preferred; fall back to Cell if no Office number.
  const primaryPhone = profile.contact.phone
    ? { label: "Office", value: profile.contact.phone }
    : { label: "Cell", value: profile.contact.cell };
  const primaryPhoneHref = `tel:${primaryPhone.value.replace(/[^+\d]/g, "")}`;

  return (
    <main className="min-h-[100dvh] bg-[#f5f5f7] text-slate-900">
      {/* ---------- Top bar ---------- */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="relative h-8 w-28 flex-shrink-0 sm:h-10 sm:w-40">
            <Image
              src={profile.companyLogo}
              alt={`${profile.company} logo`}
              fill
              sizes="160px"
              className="object-contain object-left"
              priority
            />
          </div>
          <a
            href={mailto}
            className="group inline-flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold text-[#03302d] shadow-sm transition hover:opacity-90 sm:px-5 sm:text-sm"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #e3cfa0)` }}
          >
            Book a Consultation
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-20">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            {/* eyebrow */}
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <span className="h-px w-8" style={{ backgroundColor: GOLD }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.3em]"
                style={{ color: GOLD }}
              >
                {profile.title}
              </span>
            </div>

            {/* name */}
            <h1 className="font-display mt-6 text-[clamp(34px,9vw,40px)] font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {fullName}
            </h1>

            {/* specialties */}
            <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-slate-500 sm:text-base lg:mx-0">
              {profile.specialties}
            </p>

            {/* gold divider */}
            <div
              aria-hidden
              className="mx-auto mt-8 h-px w-full max-w-xs lg:mx-0"
              style={{
                background: `linear-gradient(90deg, ${GOLD}, ${GOLD}33 60%, transparent)`,
              }}
            />

            {/* contact list */}
            <div className="mx-auto mt-7 inline-flex flex-col gap-3.5 text-base sm:text-lg lg:mx-0">
              <a
                href={mailto}
                className="group flex items-center justify-center gap-4 transition lg:justify-start"
              >
                <span className="w-16 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Email
                </span>
                <span className="font-medium text-slate-700 transition group-hover:text-slate-900">
                  {profile.contact.email}
                </span>
              </a>
              <a
                href={primaryPhoneHref}
                className="group flex items-center justify-center gap-4 transition lg:justify-start"
              >
                <span className="w-16 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {primaryPhone.label}
                </span>
                <span className="font-medium text-slate-700 transition group-hover:text-slate-900">
                  {primaryPhone.value}
                </span>
              </a>
            </div>

          </div>

          {/* Right: portrait */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* soft halo */}
              <div
                aria-hidden
                className="absolute -inset-[18px] rounded-3xl opacity-25 blur-2xl"
                style={{ background: "radial-gradient(circle, #c8a96a 0%, transparent 70%)" }}
              />
              {/* Reusable portrait frame: a fixed 4:5 aspect ratio that scales
                  with the viewport. object-cover + centered position means any
                  photo — portrait, square, or landscape — fills the frame
                  cleanly, so this works as the base template for every advisor. */}
              <div
                className="relative aspect-[4/5] w-[min(280px,72vw)] overflow-hidden rounded-2xl bg-slate-100"
                style={{ boxShadow: "0 20px 45px -18px rgba(0,0,0,0.55)" }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
                  style={{ boxShadow: `inset 0 0 0 1px ${GOLD}66` }}
                />
                <Image
                  src={profile.profilePhoto}
                  alt={`${fullName} portrait`}
                  fill
                  sizes="280px"
                  className="object-cover object-center"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Metrics band ---------- */}
      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] ring-1 ring-black/5 lg:grid-cols-4">
          {profile.metrics.map((m) => (
            <div key={m.label} className="bg-white px-5 py-7 text-center sm:py-8">
              <div className="font-display text-3xl font-bold tracking-tight tabular-nums text-slate-900 sm:text-4xl">
                {m.value}
              </div>
              <div className="mt-2 text-[12px] font-medium leading-snug text-slate-500 sm:text-[13px]">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Aspiration / About ---------- */}
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="text-center">
          <span
            className="text-[12px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            A Note from Johnathan
          </span>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Commitment to You
          </h2>
        </div>
        <blockquote className="relative mt-8">
          <span
            aria-hidden
            className="absolute -left-1 -top-6 select-none font-display text-7xl leading-none opacity-15 sm:-left-4"
            style={{ color: BRAND }}
          >
            &ldquo;
          </span>
          <p className="relative text-center text-lg leading-relaxed text-slate-700 sm:text-xl sm:leading-relaxed">
            {profile.aspirationLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        </blockquote>
      </section>

      {/* ---------- Company description ---------- */}
      <section className="relative overflow-hidden">
        {/* background image */}
        <Image
          src="/profile-backgroundpic.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        {/* dark overlay for readability */}
        <div aria-hidden className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <p
            className="text-sm font-semibold uppercase tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            {profile.tagline}
          </p>
          <h2 className="font-display mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            About {profile.company}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-white/85 sm:text-lg">
            {profile.companyDescriptionLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section className="relative overflow-hidden border-t border-black/5 bg-[#f5f5f7]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Let&rsquo;s Build Your Future Together
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-500">
              Reach out today to start a conversation about your financial goals.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            <ContactRow label={primaryPhone.label} value={primaryPhone.value} href={primaryPhoneHref} icon="phone" />
            <ContactRow label="Email" value={profile.contact.email} href={mailto} icon="mail" />
          </div>

          <div className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5">
            <svg viewBox="0 0 24 24" aria-hidden className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-900" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
            <div className="text-sm leading-snug text-slate-600">
              <p className="font-semibold text-slate-900">{profile.company}</p>
              <p>{profile.address.line1}</p>
              <p>{profile.address.line2}</p>
            </div>
          </div>

        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-black/5 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
          <p className="text-center text-xs text-slate-500 sm:text-left">
            Keybase Financial Group Inc. is a member of CIRO
          </p>
          <p className="text-center text-xs text-slate-500">
            © {profile.company}. {profile.tagline}.
          </p>
        </div>
      </footer>
    </main>
  );
}

function ContactRow({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon: "phone" | "mail";
}) {
  const icons = {
    phone: "M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.4 11.4 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.57 1 1 0 0 1-.24 1.02l-2.21 2.2z",
    mail: "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z",
  };

  const inner = (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5 transition group-hover:ring-black/10">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
        <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 text-slate-900" fill="currentColor">
          <path d={icons[icon]} />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <p className="truncate text-[15px] font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );

  return href ? (
    <a href={href} className="group block">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  );
}
