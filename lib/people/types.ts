/**
 * The Keybase people model.
 *
 * One shape for every person the site refers to — a leader, an article author,
 * an article reviewer, and (later) an advisor. A person is a single record with
 * a stable id; the roles they hold are a list on that record, not a separate
 * copy of them in a separate file. Someone who is Chief Compliance Officer,
 * writes an explainer, and reviews someone else's is one `PersonProfile` with
 * three entries in `profileTypes`.
 *
 * Almost everything is optional, and that is deliberate: the site publishes a
 * portrait and a short biography for most of the leadership team and nothing
 * else. Credentials, expertise, and professional links are fields waiting for
 * content the Keybase team has to supply — never fields to be filled in by
 * inference from a job title.
 */

/** Stable, human-readable person id. Doubles as the profile URL segment. */
export type PersonId = string;

/**
 * A hat a person wears. A person may wear several at once, so this is a list on
 * the record rather than a single mutually exclusive `type`.
 *
 * "advisor" exists for the advisor directory that comes later; no current
 * record carries it.
 */
export type ProfileType = "leadership" | "advisor" | "author" | "reviewer";

export interface PersonImage {
  /** Path under /public, or any src next/image accepts. */
  src: string;
  /** Describes the portrait. Not a place for keywords. */
  alt: string;
  /**
   * The file's true pixel dimensions, or 0 when they are not known — which is
   * the case for a portrait uploaded through the CMS. Portraits render inside a
   * fixed-ratio frame either way, so neither case shifts layout; these are here
   * for the callers that need a real size, such as the image dimensions a later
   * metadata task will emit alongside a share image.
   */
  width: number;
  height: number;
  /**
   * Optional presentation tweak carried over from the leadership cards, where
   * a couple of portraits are framed wider than the rest (`scale-110`).
   */
  className?: string;
}

export interface ProfessionalProfile {
  /** e.g. "LinkedIn". */
  label: string;
  /** A verified profile that belongs to this person. Never a guess. */
  url: string;
}

/**
 * The advisor-specific half of a person record.
 *
 * Everything a leader, an author, and an advisor share — name, role, portrait,
 * biography, credentials, expertise, languages — stays on `PersonProfile`
 * itself. Only what is genuinely particular to practising as an advisor lives
 * here, so a person who is both does not end up as two records.
 *
 * Every field is optional and every one of them is a fact the site has to state
 * before it can be filled in. In particular `serviceAreas` is a claim about
 * where an advisor takes clients, which is not the same as where their office
 * is, and is never derived from it.
 */
export interface AdvisorDetails {
  /** The office they work out of, as the site publishes it. */
  office?: string;
  city?: string;
  /** Two-letter province or territory code, e.g. "ON". */
  province?: string;
  /**
   * Places this advisor states they serve. Deliberately separate from `city`:
   * having an office in one city is not a claim to serve the next one over.
   */
  serviceAreas?: string[];
  /** Who they state they work with, e.g. "Business owners". Never inferred. */
  clientTypes?: string[];
  email?: string;
  phone?: string;
  /** Scheduling link, when one exists. No booking system is assumed. */
  bookingUrl?: string;
  /** Only when the site says so either way. Absent means unstated, not false. */
  acceptingNewClients?: boolean;
}

export interface PersonProfile {
  /** Canonical identity. Unique across the registry; used as the profile slug. */
  id: PersonId;
  name: string;
  /** Job title exactly as the site publishes it. One spelling, one record. */
  role?: string;
  /** Who they hold that role at. Absent for an unaffiliated contributor. */
  organization?: string;
  profileTypes: ProfileType[];

  image?: PersonImage;

  /** The one-line introduction, e.g. "X is Chief Compliance Officer at …". */
  shortBio?: string;
  /** The approved biography, one entry per paragraph. */
  bio?: string[];

  /**
   * Designations exactly as approved — "CFP®", "CIM". Populated only from text
   * the repository already publishes. Never inferred from a role or a bio.
   */
  credentials?: string[];
  /**
   * Subjects the person's own published copy documents them as working in.
   * Deliberately the only expertise field on the model: an advisor's "areas of
   * focus" and an author's "knowsAbout" are the same claim about the same
   * person, and a second `specialties` field beside this one would only invite
   * the two to disagree.
   */
  areasOfExpertise?: string[];
  languages?: string[];
  professionalProfiles?: ProfessionalProfile[];

  /**
   * Set for people who practise as advisors. Its presence is not what makes
   * someone an advisor — `profileTypes` is — so an advisor the site publishes
   * no office or contact details for simply has no `advisor` block.
   */
  advisor?: AdvisorDetails;

  // --- Site relationships ---
  /**
   * A page this person wrote in the first person, e.g. the CEO's letter.
   * Rendered as a link from their profile.
   */
  authoredPagePath?: string;
  /**
   * A bespoke page that already exists for this person (a digital business
   * card, an advisor landing page). Recorded so the two never drift apart —
   * not linked from the profile by default.
   */
  otherPagePath?: string;
  /**
   * True when no portrait has been published yet. The leadership grid shows a
   * "Coming Soon" tile for these people rather than a broken image.
   */
  portraitPending?: boolean;
}

/**
 * A person reduced to what a byline needs.
 *
 * `profilePath` is present only when the person actually has a published
 * profile page, so a byline never links into a 404.
 */
export interface PersonByline {
  id: PersonId;
  name: string;
  role?: string;
  profilePath?: string;
}
