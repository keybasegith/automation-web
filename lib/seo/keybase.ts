import { getPublishedGlobalSettings } from "@/lib/cms/public";
import { absoluteUrl, siteUrl } from "./siteUrl";
import { buildOrganization, type PostalAddressInput } from "./schema/organization";
import { buildPerson, buildProfilePage, type PersonInput } from "./schema/person";
import { schemaDocument, type SchemaNode } from "./schema/types";
import { isProfileReady, profilePath } from "@/lib/people/people";
import type { PersonProfile } from "@/lib/people/types";

/**
 * The Keybase entity, assembled once from content the site already publishes.
 *
 * Everything here traces to something a visitor can read:
 *   - name, description, phone, email, logo, social links → CMS global settings
 *     (lib/cms/seeds.ts), the same record the header and footer render from.
 *   - legal name → the Privacy Policy, Complaint Handling Process, and CIRO
 *     membership disclosure, which all name the registered entity.
 *   - address → the Contact page's "Visit us" block, corroborated by the
 *     Privacy Officer address in the Privacy Policy.
 *
 * Nothing is inferred, and nothing appears here that is not visible on the site.
 */

/** Stable fragment for the sitewide entity's @id, once a domain exists. */
export const ORGANIZATION_ID = "organization";

/** The public brand name. Distinct from the registered entity below. */
export const KEYBASE_NAME = "Keybase Financial Group";

/**
 * The registered entity, as written in the Privacy Policy, the Complaint
 * Handling Process, and the CIRO membership line on the advisor profile page.
 * Kept separate from the brand name rather than treated as interchangeable.
 */
export const KEYBASE_LEGAL_NAME = "Keybase Financial Group Inc.";

/**
 * The office published on the Contact page. Structured here because the CMS
 * stores `address` as one free-form line (and currently leaves it empty), which
 * cannot express a PostalAddress. If that field ever becomes structured, this
 * should read from it instead.
 */
const OFFICE: PostalAddressInput = {
  streetAddress: "1725 16th Avenue, Suite 101",
  addressLocality: "Richmond Hill",
  addressRegion: "ON",
  postalCode: "L4B 0B3",
  addressCountry: "CA",
};

/**
 * Keeps only social links that point at an actual profile.
 *
 * The seeded settings include bare platform homepages (https://x.com,
 * https://instagram.com, https://youtube.com) as placeholders. `sameAs` is a
 * claim that a URL is another official presence of this entity — a platform's
 * front page is not, so those are dropped rather than asserted.
 */
export function officialProfileUrls(
  links: { url: string }[],
): string[] {
  return links
    .map((link) => link.url?.trim())
    .filter((url): url is string => Boolean(url))
    .filter((url) => {
      try {
        const path = new URL(url).pathname.replace(/\/+$/, "");
        return path.length > 0;
      } catch {
        return false;
      }
    });
}

/**
 * The sitewide Organization document.
 *
 * `url`, `logo`, and `@id` stay absent until NEXT_PUBLIC_SITE_URL is set; the
 * rest of the entity is emitted regardless, because a name, address, and phone
 * number are facts that do not depend on where the site is hosted.
 *
 * Deliberately NOT included:
 *   - foundingDate. The only year on the site is the homepage stats band, whose
 *     own source comment marks its figures as illustrative pending verification.
 *   - Keybase Insurance Agency Ltd. It is named on the insurance pages as a
 *     separate entity, and the site states no parent/subsidiary relationship to
 *     encode. Merging the two would invent a corporate structure.
 */
export async function keybaseOrganizationSchema(): Promise<SchemaNode | null> {
  const settings = await getPublishedGlobalSettings();

  const organization = buildOrganization({
    name: settings.companyName || KEYBASE_NAME,
    legalName: KEYBASE_LEGAL_NAME,
    description: settings.defaultSeoDescription,
    url: siteUrl() ?? undefined,
    logo: settings.logoUrl ? absoluteUrl(settings.logoUrl) : undefined,
    telephone: settings.phone,
    email: settings.generalEmail,
    address: OFFICE,
    sameAs: officialProfileUrls(settings.socialLinks ?? []),
    idFragment: ORGANIZATION_ID,
  });

  return schemaDocument([organization]);
}

/** The reference other schemas use to point at Keybase without redefining it. */
export const KEYBASE_ORGANIZATION_REF = {
  name: KEYBASE_NAME,
  idFragment: ORGANIZATION_ID,
};

/**
 * The Person node for one member of the team.
 *
 * Only the facts the site itself publishes: full name, job title, the lead line
 * that introduces their biography, and the organization they hold that role at.
 *
 * `credentials`, `areasOfExpertise`, and `professionalProfiles` are read from
 * the person record when present and omitted when not — which is every person
 * today, because the site records none of them. Nothing here is derived from a
 * job title.
 *
 * `image` and `url` need an absolute origin, so both stay absent until a
 * production domain is configured rather than being pinned to a deploy preview.
 */
function personInput(person: PersonProfile): PersonInput {
  return {
    name: person.name,
    jobTitle: person.role,
    description: person.shortBio,
    image: person.image ? absoluteUrl(person.image.src) : undefined,
    url: isProfileReady(person) ? absoluteUrl(profilePath(person.id)) : undefined,
    // Claimed only where the site states the person holds a role at Keybase —
    // never for a contributor the site describes no employment for.
    worksFor: person.role && person.organization ? KEYBASE_ORGANIZATION_REF : undefined,
    sameAs: person.professionalProfiles?.map((profile) => profile.url),
    knowsAbout: person.areasOfExpertise,
  };
}

export function keybasePerson(person: PersonProfile): SchemaNode {
  return buildPerson(personInput(person));
}

/**
 * Person entities for a page that lists people — the leadership team, the
 * advisor directory. One node each, and nothing for a record without a name and
 * a title to stand on.
 */
export function keybasePeopleSchema(people: PersonProfile[]): SchemaNode | null {
  const nodes = people
    .filter((person) => person.name?.trim() && person.role?.trim())
    .map(keybasePerson);

  return schemaDocument(nodes);
}

/**
 * The ProfilePage document for one person's own page.
 *
 * `url` is omitted until a production domain exists; the ProfilePage and the
 * Person it wraps are still valid, and still describe the person, without it.
 */
export function keybaseProfilePageSchema(person: PersonProfile): SchemaNode | null {
  return schemaDocument([
    buildProfilePage({ person: personInput(person), url: absoluteUrl(profilePath(person.id)) }),
  ]);
}
