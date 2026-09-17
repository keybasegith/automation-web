import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import ServiceCta from "@/components/services/ServiceCta";
import PersonPortrait from "@/components/people/PersonPortrait";
import PersonArticles from "@/components/people/PersonArticles";
import JsonLd from "@/lib/seo/jsonLd";
import { keybaseProfilePageSchema } from "@/lib/seo/keybase";
import { getProfile } from "@/lib/people/leadership";
import { advisorContactPath, relatedServicesFor } from "@/lib/people/advisors";
import { getArticlesByAuthor, getArticlesReviewedBy } from "@/lib/insights/attribution";
import { pageMetadata } from "@/lib/seo/metadata";
import { profilePath } from "@/lib/people/people";

/**
 * One person's profile.
 *
 * Rendered on the server, in full, in the initial HTML — name, role,
 * biography, and article relationships are all in the markup before any
 * JavaScript runs.
 *
 * Rendering is dynamic for the same reason /key-executives is: leadership
 * content is editable in the /website-admin-cms ERP and staff expect an edit to
 * show up immediately. Statically generating these would freeze a title or a
 * paragraph at build time. Which slugs exist is decided by the people registry,
 * not by the URL: anything else 404s below.
 */
export const dynamic = "force-dynamic";

/**
 * A profile's own title and description, rather than the sitewide default
 * every one of these pages was inheriting.
 *
 * The description is the lead line the profile itself opens with, so the search
 * snippet and the page agree; where a person has no short bio, their role and
 * office carry it. Nothing is invented for someone the registry knows little
 * about — an unknown slug returns nothing at all and the page 404s.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = await getProfile(slug);
  if (!person) return {};

  const office = [person.advisor?.city, person.advisor?.province]
    .filter(Boolean)
    .join(", ");
  const role = [person.role, office].filter(Boolean).join(" · ");

  return pageMetadata(profilePath(person.id), `${person.name}${person.role ? ` — ${person.role}` : ""} | Keybase Financial Group`, person.shortBio ||
      `${person.name}${role ? `, ${role}` : ""} at Keybase Financial Group.`);
}

function Crumb({ label, href }: { label: string; href?: string }) {
  return href ? (
    <Link href={href} className="text-[#9aa3ad] transition-colors hover:text-[#006d6e]">
      {label}
    </Link>
  ) : (
    <span className="text-[#1a2433]">{label}</span>
  );
}

function Section({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-12 border-t border-black/10 pt-8">
      <h2
        id={id}
        className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]"
      >
        {heading}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = await getProfile(slug);
  // An unknown slug, someone hidden in the ERP, or someone whose data is too
  // thin to publish: all of them are a real 404, never an empty page with a 200.
  if (!person) notFound();

  const isLeadership = person.profileTypes.includes("leadership");
  const isAdvisor = person.profileTypes.includes("advisor");
  const written = getArticlesByAuthor(person.id);
  const reviewed = getArticlesReviewedBy(person.id);
  const relatedServices = isAdvisor ? relatedServicesFor(person) : [];
  const office = [person.advisor?.city, person.advisor?.province]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />
      <BreadcrumbSchema items={[
        ...(isLeadership ? [{ name: "About Us", path: "/about" }, { name: "Key Executives", path: "/key-executives" }] : isAdvisor ? [{ name: "Our Advisors", path: "/our-advisors" }] : []),
        { name: person.name, path: profilePath(person.id) },
      ]} />

      <main data-advisor-profile={isAdvisor || undefined} className="mx-auto max-w-[1280px] px-5 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-14">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[14px]">
          <Crumb label="Home" href="/" />
          <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
          {isLeadership && (
            <>
              <Crumb label="About Us" href="/about" />
              <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
              <Crumb label="Key Executives" href="/key-executives" />
              <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
            </>
          )}
          {!isLeadership && isAdvisor && (
            <>
              <Crumb label="Our Team" />
              <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
              <Crumb label="Our Advisors" href="/our-advisors" />
              <ChevronRight className="h-3.5 w-3.5 text-[#c2c8cf]" />
            </>
          )}
          <Crumb label={person.name} />
        </nav>

        <article className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-16">
          {/* Portrait column. Sticky on desktop so the person stays present
              while their biography is read. */}
          <div className="mx-auto w-full max-w-[320px] lg:mx-0 lg:sticky lg:top-28 lg:self-start">
            {person.image && (
              <PersonPortrait
                image={person.image}
                sizes="(min-width: 1024px) 320px, 100vw"
                priority
                className="rounded-sm ring-1 ring-black/[0.04]"
              />
            )}
            {person.organization && (
              <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#006d6e]">
                {person.organization}
              </p>
            )}
          </div>

          <div className="max-w-2xl">
            <h1 className="font-serif text-[40px] font-normal leading-[1.05] tracking-tight text-[#0a1f33] sm:text-[52px]">
              {person.name}
            </h1>
            {person.role && (
              <p className="mt-4 text-[17px] leading-relaxed text-[#5b6573]">
                {person.role}
                {/* Stated plainly, so the fact is easy to lift out of the page:
                    who, what, where, and for whom. Only the parts the record
                    actually holds are printed. */}
                {person.organization && ` at ${person.organization}`}
                {office && ` · ${office}`}
              </p>
            )}

            {isAdvisor && (
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href={advisorContactPath(person)}
                  className="inline-flex items-center gap-2 bg-[#0a1f33] px-6 py-3 text-[13px] font-semibold tracking-wide text-white transition-colors hover:bg-[#0e2a45]"
                >
                  Request a meeting
                </Link>
                {person.advisor?.email && (
                  <a
                    href={`mailto:${person.advisor.email}`}
                    className="text-[15px] font-semibold text-[#006d6e] underline decoration-[#006d6e]/30 underline-offset-4 transition-colors hover:text-[#0a1f33]"
                  >
                    {person.advisor.email}
                  </a>
                )}
                {person.advisor?.phone && (
                  <a
                    href={`tel:${person.advisor.phone.replace(/[^+\d]/g, "")}`}
                    className="text-[15px] text-[#5b6573] transition-colors hover:text-[#0a1f33]"
                  >
                    {person.advisor.phone}
                  </a>
                )}
                {person.advisor?.bookingUrl && (
                  <a
                    href={person.advisor.bookingUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-[15px] font-semibold text-[#006d6e] underline decoration-[#006d6e]/30 underline-offset-4 transition-colors hover:text-[#0a1f33]"
                  >
                    Book a meeting
                  </a>
                )}
              </div>
            )}

            {(person.shortBio || person.bio?.length) && (
              <Section id="about" heading="About">
                {person.shortBio && (
                  <p className="font-serif text-[21px] font-normal leading-snug text-[#0a1f33]">
                    {person.shortBio}
                  </p>
                )}
                {person.bio?.length ? (
                  <div className="mt-5 space-y-4 text-[16px] leading-relaxed text-[#5b6573]">
                    {person.bio.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}
              </Section>
            )}

            {/* Every section below renders only when the record actually holds
                the data. Nothing outputs an "N/A" or an empty block. */}
            {person.areasOfExpertise?.length ? (
              <Section
                id="expertise"
                heading={isAdvisor ? "Areas of Focus" : "Areas of Expertise"}
              >
                <ul className="flex flex-wrap gap-2">
                  {person.areasOfExpertise.map((area) => (
                    <li
                      key={area}
                      className="rounded-full border border-black/10 px-4 py-1.5 text-[14px] text-[#5b6573]"
                    >
                      {area}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {person.credentials?.length ? (
              <Section id="credentials" heading="Credentials">
                <ul className="space-y-2 text-[16px] leading-relaxed text-[#5b6573]">
                  {person.credentials.map((credential) => (
                    <li key={credential}>{credential}</li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {person.languages?.length ? (
              <Section id="languages" heading="Languages">
                <p className="text-[16px] leading-relaxed text-[#5b6573]">
                  {person.languages.join(", ")}
                </p>
              </Section>
            ) : null}

            {person.advisor?.clientTypes?.length ? (
              <Section id="client-types" heading="Who They Work With">
                <ul className="flex flex-wrap gap-2">
                  {person.advisor.clientTypes.map((type) => (
                    <li
                      key={type}
                      className="rounded-full border border-black/10 px-4 py-1.5 text-[14px] text-[#5b6573]"
                    >
                      {type}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {person.advisor?.serviceAreas?.length ? (
              <Section id="service-areas" heading="Areas Served">
                <p className="text-[16px] leading-relaxed text-[#5b6573]">
                  {person.advisor.serviceAreas.join(", ")}
                </p>
              </Section>
            ) : null}

            {relatedServices.length > 0 && (
              <Section id="related-services" heading="Related Services">
                {/* Drawn from this person's stated areas of focus only — nobody
                    is linked to every service page. */}
                <ul className="space-y-3">
                  {relatedServices.map((service) => (
                    <li key={service.href}>
                      <Link href={service.href} className="group inline-flex items-center gap-1.5">
                        <span className="font-serif text-[19px] font-normal text-[#0a1f33] transition-colors group-hover:text-[#006d6e]">
                          {service.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#006d6e] transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {written.length > 0 && (
              <Section id="articles-written" heading="Articles Written">
                <PersonArticles articles={written} />
              </Section>
            )}

            {reviewed.length > 0 && (
              <Section id="articles-reviewed" heading="Articles Reviewed">
                <PersonArticles articles={reviewed} />
              </Section>
            )}

            {person.professionalProfiles?.length ? (
              <Section id="profiles" heading="Professional Profiles">
                <ul className="space-y-2">
                  {person.professionalProfiles.map((profile) => (
                    <li key={profile.url}>
                      <a
                        href={profile.url}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="text-[16px] font-semibold text-[#006d6e] underline decoration-[#006d6e]/30 underline-offset-4 transition-colors hover:text-[#0a1f33]"
                      >
                        {profile.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-black/10 pt-8 text-[15px]">
              {person.authoredPagePath && (
                <Link
                  href={person.authoredPagePath}
                  className="group inline-flex items-center gap-1.5 font-semibold text-[#006d6e] transition-colors hover:text-[#0a1f33]"
                >
                  Read a message from {person.name.split(" ")[0]}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
              {isLeadership && (
                <Link
                  href="/key-executives"
                  className="inline-flex items-center gap-1.5 text-[#5b6573] transition-colors hover:text-[#0a1f33]"
                >
                  Back to Key Executives
                </Link>
              )}
              {isAdvisor && (
                <Link
                  href="/our-advisors"
                  className="inline-flex items-center gap-1.5 text-[#5b6573] transition-colors hover:text-[#0a1f33]"
                >
                  Back to Our Advisors
                </Link>
              )}
            </div>

            {/* The membership line the advisor landing page already carries,
                word for word. The sitewide footer disclosure renders beneath
                this on every page; nothing new is asserted here. Flagged for
                compliance review before advisor profiles go live. */}
            {isAdvisor && (
              <p className="mt-8 text-[13px] leading-relaxed text-[#7a828d]">
                Keybase Financial Group Inc. is a member of CIRO.
              </p>
            )}
          </div>
        </article>

        <JsonLd data={keybaseProfilePageSchema(person)} />
      </main>

      <ServiceCta
        heading="Speak with the Keybase team."
        body="Whatever stage you are at, a Keybase advisor can talk through your goals and what a plan built around them would look like."
      />

      <SiteFooter />
    </div>
  );
}
