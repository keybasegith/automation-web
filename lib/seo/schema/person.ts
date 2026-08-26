import { compact, entityReference, type SchemaNode } from "./types";
import { entityId } from "../siteUrl";

export interface PersonInput {
  name: string;
  jobTitle?: string;
  description?: string;
  /** Absolute image URL. Omitted when no production domain is configured. */
  image?: string;
  /** Absolute URL of the person's own page, when one exists. */
  url?: string;
  /** The organization they work for, referenced rather than redefined. */
  worksFor?: { name: string; idFragment?: string };
  /** Verified official profile URLs only — never guessed. */
  sameAs?: string[];
  /**
   * Subjects the person is documented as working in. Only ever populated from
   * text the site already publishes about them; never inferred from a job title.
   */
  knowsAbout?: string[];
}

export function buildPerson(input: PersonInput): SchemaNode {
  return compact({
    "@type": "Person",
    name: input.name,
    jobTitle: input.jobTitle,
    description: input.description,
    image: input.image,
    url: input.url,
    worksFor: input.worksFor
      ? entityReference(
          "Organization",
          input.worksFor.name,
          input.worksFor.idFragment ? entityId(input.worksFor.idFragment) : undefined,
        )
      : undefined,
    sameAs: input.sameAs,
    knowsAbout: input.knowsAbout,
  });
}

export interface ProfilePageInput {
  /** The person the page is about. */
  person: PersonInput;
  /** Absolute URL of the profile page itself. */
  url?: string;
  dateCreated?: string;
  dateModified?: string;
}

/**
 * A `ProfilePage` wrapping the Person it describes.
 *
 * Infrastructure for the advisor profiles that do not exist yet. Use it only on
 * a page whose entire subject is one person — not on a leadership index, where
 * the page is about the team rather than any single individual.
 */
export function buildProfilePage(input: ProfilePageInput): SchemaNode {
  return compact({
    "@type": "ProfilePage",
    url: input.url,
    dateCreated: input.dateCreated,
    dateModified: input.dateModified,
    mainEntity: buildPerson(input.person),
  });
}
