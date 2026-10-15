import Image from "next/image";
import type { AdvisorTemplateProfile } from "@/lib/advisor-portal/template";

// Default design: keybase-website /profile-shomari.
export default function AdvisorPageTemplate({ profile }: { profile: AdvisorTemplateProfile }) {
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const BRAND = "#006d6e";
  const GOLD = "#c8a96a";
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-8 sm:py-3">
          <div className="relative h-7 w-24 flex-shrink-0 sm:h-10 sm:w-40">
            <Image
              src={profile.companyLogo}
              alt={`${profile.company} logo`}
              fill
              sizes="160px"
              className="object-contain object-left"
              preload
            />
          </div>
          <a
            href={mailto}
            className="group inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-[#03302d] shadow-sm transition hover:opacity-90 sm:gap-2 sm:px-5 sm:py-2 sm:text-sm"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #e3cfa0)` }}
          >
            {profile.cta || "Book a Consultation"}
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
        <div className="relative mx-auto grid max-w-6xl items-center gap-7 px-5 pt-9 pb-16 sm:gap-10 sm:px-8 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-20">
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
            <h1 className="font-display mt-3 text-[clamp(28px,8vw,36px)] font-bold leading-[1.05] tracking-tight text-slate-900 sm:mt-6 sm:text-5xl lg:text-6xl">
              {fullName}
            </h1>

            {/* lead line */}
            <p className="mx-auto mt-3.5 max-w-[30ch] text-[15px] leading-relaxed text-slate-600 sm:mt-6 sm:max-w-md sm:text-lg sm:text-slate-700 lg:mx-0">
              {profile.specialties}
            </p>

            {/* gold divider */}
            <div
              aria-hidden
              className="mx-auto mt-6 h-px w-full max-w-[240px] sm:mt-8 sm:max-w-xs lg:mx-0"
              style={{
                background: `linear-gradient(90deg, ${GOLD}, ${GOLD}33 60%, transparent)`,
              }}
            />

            {/* contact list */}
            <div className="mx-auto mt-5 inline-flex flex-col gap-2.5 text-[15px] sm:mt-7 sm:gap-3.5 sm:text-lg lg:mx-0">
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

          {/* Right: portrait — shown first on mobile so the page opens on his face */}
          <div className="order-first flex justify-center lg:order-none lg:justify-end">
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
                className="relative aspect-[4/5] w-[min(200px,55vw)] overflow-hidden rounded-2xl bg-slate-100 sm:w-[min(280px,72vw)]"
                style={{ boxShadow: "0 20px 45px -18px rgba(0,0,0,0.55)" }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
                  style={{ boxShadow: `inset 0 0 0 1px ${GOLD}66` }}
                />
                {profile.profilePhoto ? (
                  <Image
                    src={profile.profilePhoto}
                    alt={`${fullName} portrait`}
                    fill
                    sizes="280px"
                    className="object-cover object-center"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl text-slate-400">
                    {profile.firstName[0]}
                    {profile.lastName[0]}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Metrics band ---------- */}
      <section className="relative z-10 mx-auto -mt-7 max-w-6xl px-5 sm:-mt-10 sm:px-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] ring-1 ring-black/5 lg:grid-cols-4">
          {profile.metrics.map((m) => (
            <div key={m.label} className="bg-white px-3 py-5 text-center sm:px-5 sm:py-8">
              <div className="font-display text-[22px] font-bold tracking-tight tabular-nums text-slate-900 sm:text-4xl">
                {m.value}
              </div>
              <div className="mt-1 text-[11px] font-medium leading-snug text-slate-500 sm:mt-2 sm:text-[13px]">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Aspiration / About ---------- */}
      <section className="mx-auto max-w-4xl px-6 py-12 sm:px-8 sm:py-20">
        <div className="text-center">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em] sm:text-[12px]"
            style={{ color: GOLD }}
          >
            {profile.noteLabel || `A Note from ${profile.firstName}`}
          </span>
          <h2 className="font-display mt-2 text-xl font-bold tracking-tight text-slate-900 sm:mt-3 sm:text-3xl">
            {profile.noteHeading || "My Commitment to You"}
          </h2>
        </div>
        <blockquote className="relative mt-6 sm:mt-8">
          <span
            aria-hidden
            className="absolute -left-1 -top-4 select-none font-display text-5xl leading-none opacity-15 sm:-left-4 sm:-top-6 sm:text-7xl"
            style={{ color: BRAND }}
          >
            &ldquo;
          </span>
          {/* Authored line breaks only apply from sm up; on phones the quote
              flows naturally so lines written for desktop widths don't rag. */}
          <p className="relative text-center text-[15px] leading-relaxed text-slate-700 sm:text-xl sm:leading-relaxed">
            {profile.aspirationLines.map((line, i) => (
              <span key={i} className="sm:block">
                {line}{" "}
              </span>
            ))}
          </p>
        </blockquote>
      </section>

      {profile.sections?.map((section, index) => (
        <section
          key={index}
          className="mx-auto max-w-4xl px-5 py-10 text-center"
        >
          <h2 className="text-2xl font-semibold">{section.title}</h2>
          <p className="mt-5 whitespace-pre-line text-slate-600">
            {section.body}
          </p>
        </section>
      ))}

      {/* ---------- Company description ---------- */}
      <section className="relative overflow-hidden">
        {/* background image */}
        <Image
          src={profile.backgroundPhoto || "/profile-backgroundpic.jpg"}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        {/* dark overlay for readability */}
        <div aria-hidden className="absolute inset-0 bg-black/65" />
        <div className="relative mx-auto max-w-3xl px-6 py-14 text-center sm:px-8 sm:py-28">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em] sm:text-sm"
            style={{ color: GOLD }}
          >
            {profile.tagline}
          </p>
          <h2 className="font-display mt-3 text-xl font-bold tracking-tight text-white sm:mt-4 sm:text-3xl">
            About {profile.company}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85 sm:mt-5 sm:text-lg">
            {profile.companyDescriptionLines.map((line, i) => (
              <span key={i} className="sm:block">
                {line}{" "}
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section className="relative overflow-hidden border-t border-black/5 bg-[#f5f5f7]">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {profile.contactHeading || "Let’s Build Your Future Together"}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-[14px] text-slate-500 sm:mt-3 sm:text-base">
              {profile.contactIntro || "Reach out today to start a conversation about your financial goals."}
            </p>
          </div>

          <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4">
            <ContactRow label={primaryPhone.label} value={primaryPhone.value} href={primaryPhoneHref} icon="phone" />
            <ContactRow label="Email" value={profile.contact.email} href={mailto} icon="mail" />
          </div>

          <div className="mx-auto mt-3 flex max-w-3xl items-start gap-3 rounded-2xl bg-white px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5">
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
      <footer className="border-t border-black/5 bg-white py-6 sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 sm:flex-row sm:gap-4 sm:px-8">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <Image
              src="/CIRO_Logo.jpg"
              alt="Canadian Investment Regulatory Organization (CIRO)"
              width={320}
              height={88}
              className="h-9 w-auto sm:h-10"
            />
            <p className="text-center text-xs text-slate-500 sm:text-left">
              {profile.footerDisclosure || "Keybase Financial Group Inc. is a member of CIRO"}
            </p>
          </div>
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
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 sm:gap-3.5 sm:px-5 sm:py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-black/5 transition group-hover:ring-black/10">
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
