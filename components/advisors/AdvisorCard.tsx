import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import PersonPortrait from "@/components/people/PersonPortrait";
import { advisorContactPath, advisorProfilePath } from "@/lib/people/advisors";
import type { PersonProfile } from "@/lib/people/types";

/** "Richmond Hill, ON" — or just whichever half the record actually holds. */
function officeLine(person: PersonProfile): string | undefined {
  const { city, province } = person.advisor ?? {};
  return [city, province].filter(Boolean).join(", ") || undefined;
}

/**
 * One advisor in the directory.
 *
 * Scannable on purpose: portrait, name, title, office, a few areas of focus,
 * and a way to get in touch. No biography — that belongs on a profile, and
 * cramming it in here would turn a directory into a wall of prose.
 *
 * Every row is conditional. An advisor with no portrait, no office and no
 * stated focus renders as name, title and a contact action, with no empty
 * labels standing in for the rest.
 *
 * Navigation is plain anchors throughout — no onClick handlers standing in for
 * links — so the card works with the keyboard, with the middle mouse button,
 * and for a crawler.
 */
export default function AdvisorCard({
  person,
  /** The first card in the grid is above the fold on most screens. */
  priority = false,
}: {
  person: PersonProfile;
  priority?: boolean;
}) {
  const profileHref = advisorProfilePath(person);
  const office = officeLine(person);
  const focus = person.areasOfExpertise ?? [];

  return (
    <article className="flex h-full flex-col border border-black/10 bg-white transition-shadow duration-300 hover:shadow-[0_28px_60px_-32px_rgba(10,31,51,0.45)]">
      {person.image ? (
        <PersonPortrait
          image={person.image}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
          priority={priority}
          ratio="aspect-[4/5]"
        />
      ) : (
        // No portrait has been published for this advisor. A neutral frame
        // keeps the grid aligned; nothing stands in for a photograph.
        <div
          aria-hidden
          className="flex aspect-[4/5] w-full items-center justify-center bg-[#eef1f4]"
        >
          <span className="font-serif text-[15px] text-[#9aa3ad]">
            Portrait to follow
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-[22px] font-normal leading-snug text-[#0a1f33]">
          {profileHref ? (
            <Link
              href={profileHref}
              className="transition-colors hover:text-[#006d6e] focus-visible:text-[#006d6e]"
            >
              {person.name}
            </Link>
          ) : (
            person.name
          )}
        </h3>
        {person.role && (
          <p className="mt-1.5 text-[14px] text-[#5b6573]">{person.role}</p>
        )}

        {office && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[#7a828d]">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {office}
          </p>
        )}

        {person.languages?.length ? (
          <p className="mt-2 text-[13px] text-[#7a828d]">
            Speaks {person.languages.join(", ")}
          </p>
        ) : null}

        {focus.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {/* A card shows a few areas, not an inventory. */}
            {focus.slice(0, 3).map((area) => (
              <li
                key={area}
                className="border border-black/10 px-2.5 py-1 text-[12px] leading-snug text-[#5b6573]"
              >
                {area}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6 text-[14px]">
          <Link
            href={advisorContactPath(person)}
            className="group inline-flex items-center gap-1.5 font-semibold text-[#006d6e] transition-colors hover:text-[#0a1f33]"
          >
            Request a meeting
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            <span className="sr-only"> with {person.name}</span>
          </Link>
          {profileHref ? (
            <Link
              href={profileHref}
              className="text-[#5b6573] underline decoration-[#5b6573]/30 underline-offset-4 transition-colors hover:text-[#006d6e]"
            >
              Full profile
              <span className="sr-only"> of {person.name}</span>
            </Link>
          ) : (
            person.otherPagePath && (
              <Link
                href={person.otherPagePath}
                className="text-[#5b6573] underline decoration-[#5b6573]/30 underline-offset-4 transition-colors hover:text-[#006d6e]"
              >
                Contact details
                <span className="sr-only"> for {person.name}</span>
              </Link>
            )
          )}
        </div>
      </div>
    </article>
  );
}
