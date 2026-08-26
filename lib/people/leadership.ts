import { getVisiblePublishedExecutives } from "@/lib/cms/public";
import type { ExecutiveItem } from "@/lib/cms/types";
import {
  PEOPLE,
  getPerson,
  getPersonByName,
  isProfileReady,
  personSlug,
  profilePath,
} from "./people";
import type { PersonId, PersonImage, PersonProfile } from "./types";

/**
 * Where the people registry meets the CMS.
 *
 * Leadership content is editable in the /website-admin-cms ERP: staff can
 * change a title, rewrite a paragraph, upload a new portrait, or hide someone
 * from the team page. That has to keep working, and it has to be the same
 * person the rest of the site knows about — not a second, parallel copy.
 *
 * So the split is:
 *   - the CMS owns the editable leadership content (title, lead, paragraphs,
 *     portrait, visibility);
 *   - the registry owns identity and everything the CMS has no field for (the
 *     stable id and therefore the profile URL, the roles the person holds,
 *     credentials, expertise, professional links);
 *   - this module merges the two into one `PersonProfile` per person.
 *
 * If the store cannot be read, the registry's own copy stands in — which is
 * exactly what the leadership page's fallback list used to do, minus the second
 * transcription of every biography.
 */

/**
 * A CMS record that matches no registry entry — someone added in the ERP after
 * this file was written — still becomes a person, derived from what the CMS
 * holds. Being absent from the registry costs them the extra fields, not their
 * place on the team page.
 */
function personFromExecutive(item: ExecutiveItem): PersonProfile {
  return {
    id: personSlug(item.name),
    name: item.name,
    role: item.title,
    organization: "Keybase Financial Group",
    profileTypes: ["leadership"],
    shortBio: item.lead || undefined,
    bio: item.paragraphs?.length ? item.paragraphs : undefined,
    portraitPending: item.comingSoon,
    image: portraitFrom(item, undefined),
  };
}

/**
 * The portrait to render.
 *
 * Intrinsic dimensions are known only for the images that ship with the repo,
 * so they are carried over only when the CMS is still pointing at that same
 * file. A portrait uploaded through the ERP has no dimensions here; the profile
 * page renders those in a fixed-ratio frame instead, so neither case shifts
 * layout while loading.
 */
function portraitFrom(
  item: ExecutiveItem,
  base: PersonProfile | undefined,
): PersonImage | undefined {
  if (item.comingSoon || !item.photoUrl) return undefined;

  const known = base?.image;
  if (known && known.src === item.photoUrl) {
    return item.photoClass ? { ...known, className: item.photoClass } : known;
  }

  return {
    src: item.photoUrl,
    alt: `Portrait of ${item.name}`,
    width: 0,
    height: 0,
    className: item.photoClass ?? undefined,
  };
}

function merge(base: PersonProfile, item: ExecutiveItem): PersonProfile {
  return {
    ...base,
    // CMS-editable content wins; the registry supplies whatever the CMS has no
    // field for. Empty CMS values fall back rather than blanking the person out.
    name: item.name || base.name,
    role: item.title || base.role,
    shortBio: item.lead || base.shortBio,
    bio: item.paragraphs?.length ? item.paragraphs : base.bio,
    portraitPending: item.comingSoon,
    image: portraitFrom(item, base),
  };
}

/** The registry's own view of the team, used when the CMS cannot be read. */
function registryLeadership(): PersonProfile[] {
  return PEOPLE.filter((person) => person.profileTypes.includes("leadership"));
}

/**
 * The published leadership team, newest CMS content merged in, in CMS order.
 *
 * Never throws: a store hiccup must not take down a public marketing page.
 */
export async function getLeadershipProfiles(): Promise<PersonProfile[]> {
  let items: ExecutiveItem[];
  try {
    items = await getVisiblePublishedExecutives();
  } catch {
    return registryLeadership();
  }
  if (items.length === 0) return registryLeadership();

  return items.map((item) => {
    const base = getPersonByName(item.name);
    return base ? merge(base, item) : personFromExecutive(item);
  });
}

/**
 * One person, as the site currently publishes them.
 *
 * Leadership records come back with the CMS's edits merged in, so a title
 * changed in the ERP reaches an article byline and a profile page alike.
 * Someone whose record does not claim leadership (a future author or advisor)
 * resolves straight from the registry.
 *
 * Undefined means the site no longer publishes this person — a leadership
 * member hidden or removed in the ERP resolves to nothing rather than to a
 * stale copy of themselves.
 */
export async function resolvePerson(
  id: PersonId,
): Promise<PersonProfile | undefined> {
  // Only leadership content lives in the CMS. Anyone else — an advisor, an
  // outside author — resolves from the registry without a store read.
  const base = getPerson(id);
  if (base && !base.profileTypes.includes("leadership")) return base;

  const team = await getLeadershipProfiles();
  return team.find((person) => person.id === id);
}

/**
 * One person's profile, or undefined when there should not be a page.
 *
 * Undefined covers three distinct cases, all of which must 404 rather than
 * render an empty page: the slug matches nobody, the person is no longer
 * published, and the person's data is too thin to publish a page about.
 */
export async function getProfile(id: PersonId): Promise<PersonProfile | undefined> {
  const person = await resolvePerson(id);
  return person && isProfileReady(person) ? person : undefined;
}

/** Profile link for a person on the team, or undefined if they have no page. */
export function profilePathIfReady(person: PersonProfile): string | undefined {
  return isProfileReady(person) ? profilePath(person.id) : undefined;
}
