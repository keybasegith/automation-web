import type { PersonByline, PersonId, PersonProfile, ProfileType } from "./types";

/**
 * The canonical people registry — leadership below, advisors further down,
 * combined into `PEOPLE`.
 *
 * One record per person, and one place that record lives. Before this file the
 * same seven biographies existed three times — in the CMS seed, in the
 * leadership page's fallback list, and again in the JSON store — and nothing
 * kept them in step. Now the CMS seed is generated from these records
 * (lib/cms/seeds.ts) and the leadership page falls back to them, so a title
 * fixed here is fixed everywhere.
 *
 * WHAT IS IN HERE
 *   Only what the repository already publishes: full name, job title, the lead
 *   line and biography paragraphs from the leadership page, the portrait the
 *   site already serves, and — for advisors — the office address their own
 *   business card prints.
 *
 * WHAT IS DELIBERATELY NOT IN HERE
 *   Credentials, designations, licences, registrations, years of experience,
 *   languages, client types, service areas, and professional profile links.
 *   The site states none of these for any of these people. They are fields on
 *   the model waiting for content the Keybase team supplies — not blanks to be
 *   filled in from a job title, a name, or an office address. A Chief
 *   Compliance Officer is not thereby a CFP, "leads the firm's technology
 *   systems" is not an expertise taxonomy, and an office in Richmond Hill is
 *   not a claim to serve Toronto.
 *
 *   Exactly one person carries `areasOfExpertise`, because exactly one person's
 *   page prints them. See the advisor list below.
 *
 * ORDER
 *   Display order for the leadership grid, CEO first. The CMS `sort_order`
 *   follows from it.
 */
const LEADERSHIP: PersonProfile[] = [
  {
    id: "dax-sukhraj",
    name: "Dax Sukhraj",
    role: "President & CEO",
    organization: "Keybase Financial Group",
    profileTypes: ["leadership"],
    image: {
      src: "/dax-profile-updated.jpg",
      alt: "Portrait of Dax Sukhraj",
      width: 784,
      height: 1112,
    },
    shortBio: "Dax Sukhraj is President & CEO at Keybase Financial Group.",
    bio: [
      "As President & CEO, Mr. Sukhraj sets the strategic direction of the firm, championing an independent, client-first model built on transparency and disciplined advice.",
      "Prior to leading Keybase, he held senior roles across wealth management and capital markets, advising individuals, families, and institutions through every stage of the market cycle.",
      "Mr. Sukhraj has more than two decades of experience in the financial services industry and remains personally committed to building durable relationships that span generations.",
    ],
    authoredPagePath: "/ceo-message",
    otherPagePath: "/businesscard-dax",
  },
  {
    id: "linda-yang",
    name: "Linda Yang",
    role: "Vice President, Chief Financial Officer",
    organization: "Keybase Financial Group",
    profileTypes: ["leadership"],
    // No portrait has been published; the leadership grid shows a Coming Soon
    // tile. Nothing stands in for a photograph that does not exist.
    portraitPending: true,
    shortBio:
      "Linda Yang is Vice President and Chief Financial Officer at Keybase Financial Group.",
    bio: [
      "Ms. Yang oversees the firm's financial management, reporting, and capital planning, ensuring a strong and disciplined financial foundation.",
      "She brings extensive experience in finance and corporate strategy across the financial services industry, with a focus on stability, transparency, and responsible growth.",
      "Ms. Yang is dedicated to maintaining the financial integrity that underpins the trust clients and advisors place in Keybase.",
    ],
  },
  {
    id: "keith-sutherland",
    name: "Keith Sutherland",
    role: "Vice President, System Development and Support",
    organization: "Keybase Financial Group",
    profileTypes: ["leadership"],
    image: {
      src: "/keith-profile2.jpg",
      alt: "Portrait of Keith Sutherland",
      width: 842,
      height: 752,
    },
    shortBio:
      "Keith Sutherland is Vice President, System Development and Support at Keybase Financial Group.",
    bio: [
      "Mr. Sutherland leads the firm's technology systems, development, and support, building the digital infrastructure that powers a modern advisory experience.",
      "He brings extensive experience in systems development and technical operations across the financial services industry, with a focus on reliability, security, and innovation.",
      "Mr. Sutherland is dedicated to delivering the tools and platforms that help advisors serve clients seamlessly and securely.",
    ],
  },
  {
    id: "krissy-sukhraj",
    name: "Krissy Sukhraj",
    role: "Director of Marketing & Corporate Strategy",
    organization: "Keybase Financial Group",
    profileTypes: ["leadership"],
    image: {
      src: "/krissy-newprofile.jpg",
      alt: "Portrait of Krissy Sukhraj",
      width: 1186,
      height: 1078,
      className: "scale-110",
    },
    shortBio:
      "Krissy Sukhraj is Director of Marketing & Corporate Strategy at Keybase Financial Group.",
    bio: [
      "Ms. Sukhraj shapes the firm's brand, client experience, and long-term strategic direction, connecting the Keybase story with the families and institutions it serves.",
      "She brings extensive experience across marketing, communications, and corporate strategy, with a focus on building meaningful, lasting client relationships.",
      "Ms. Sukhraj leads the firm's growth initiatives and is dedicated to ensuring the Keybase experience is clear, personal, and consistent at every touchpoint.",
    ],
    otherPagePath: "/businesscard-krissy",
  },
  {
    id: "mark-garcia",
    name: "Mark Garcia",
    role: "Chief Compliance Officer",
    organization: "Keybase Financial Group",
    profileTypes: ["leadership"],
    image: {
      src: "/mark-newprofilepic.jpg",
      alt: "Portrait of Mark Garcia",
      width: 804,
      height: 904,
    },
    shortBio: "Mark Garcia is Chief Compliance Officer at Keybase Financial Group.",
    bio: [
      "Mr. Garcia oversees the firm's regulatory, risk, and governance framework, ensuring every client engagement meets the highest standards of integrity and fiduciary care.",
      "He has held senior compliance and risk leadership roles across the financial services industry, building programs that protect clients while enabling responsible growth.",
      "Mr. Garcia is recognized for embedding a culture of accountability and transparency throughout every level of the organization.",
    ],
    otherPagePath: "/businesscard-mark",
  },
  {
    id: "pushpa-shivanthan",
    name: "Pushpa Shivanthan",
    role: "Vice President, Back Office Administration",
    organization: "Keybase Financial Group",
    profileTypes: ["leadership"],
    image: {
      src: "/pushpa-profile2.jpg",
      alt: "Portrait of Pushpa Shivanthan",
      width: 532,
      height: 580,
    },
    shortBio:
      "Pushpa Shivanthan is Vice President, Back Office Administration at Keybase Financial Group.",
    bio: [
      "Ms. Shivanthan leads the firm's back office and administrative operations, ensuring accurate, timely, and seamless support across every client and advisor interaction.",
      "She brings extensive experience in operations and administration across the financial services industry, with a focus on accuracy, efficiency, and reliability.",
      "Ms. Shivanthan is committed to building the disciplined processes and systems that keep the firm running smoothly behind the scenes.",
    ],
  },
  {
    id: "jerome-pare",
    name: "Jerome Pare",
    role: "Senior I.T. Specialist",
    organization: "Keybase Financial Group",
    profileTypes: ["leadership"],
    image: {
      src: "/jerome-profile.jpg",
      alt: "Portrait of Jerome Pare",
      width: 842,
      height: 754,
    },
    shortBio: "Jerome Pare is Senior I.T. Specialist at Keybase Financial Group.",
    bio: [
      "Mr. Pare supports the firm's information technology systems, ensuring secure, reliable, and responsive infrastructure across the organization.",
      "He brings hands-on experience across IT operations, security, and support within the financial services industry.",
      "Mr. Pare is dedicated to keeping the firm's technology running smoothly so advisors and staff can focus on serving clients.",
    ],
  },
];

/**
 * The head office, exactly as every business card and the Contact page publish
 * it. Shared because it is the same office, not because it is a default: an
 * advisor working somewhere else gets their own, and one the site publishes no
 * office for gets none.
 */
const HEAD_OFFICE = {
  office: "Head Office",
  city: "Richmond Hill",
  province: "ON",
} as const;

/**
 * Keybase advisors.
 *
 * Sources, and only these: the digital business cards under app/businesscard-*
 * (name, title, portrait, office address) and the advisor landing page at
 * app/profile-jleung (name, title, portrait, office address, and the three
 * practice areas printed under his name).
 *
 * WHAT IS NOT HERE, FOR EVERY ONE OF THEM
 *   A biography. Not one of these people has published prose about themselves
 *   anywhere in this repository, which is why none of them has a profile page —
 *   see `isProfileReady`. Also absent: credentials, languages, client types,
 *   and service areas. The site states none of those for any advisor, and none
 *   of them can be derived from a job title, a name, or an office address.
 *
 * The office is a published fact, not an inference: every card prints
 * "1725 16th Avenue, Suite 101, Richmond Hill, ON" as that advisor's business
 * address. It is deliberately recorded as their office and NOT as a service
 * area — Keybase's map claims coverage far beyond Richmond Hill, and an office
 * address is not a claim to serve any particular city.
 */
const ADVISORS: PersonProfile[] = [
  {
    id: "darko-strukan",
    name: "Darko Strukan",
    role: "Financial Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["advisor"],
    image: {
      src: "/darko-profile.jpg",
      alt: "Portrait of Darko Strukan",
      width: 4000,
      height: 6000,
    },
    advisor: { ...HEAD_OFFICE },
    otherPagePath: "/businesscard-darko",
  },
  {
    id: "ernest-saintal",
    name: "Ernest Saintal",
    role: "Financial Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["advisor"],
    image: {
      src: "/ernest-profile.jpg",
      alt: "Portrait of Ernest Saintal",
      width: 1298,
      height: 1104,
    },
    advisor: { ...HEAD_OFFICE },
    otherPagePath: "/businesscard-ernest",
  },
  {
    id: "hari-sukhraj",
    name: "Hari Sukhraj",
    role: "Financial Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["advisor"],
    image: {
      src: "/hari-profile.jpg",
      alt: "Portrait of Hari Sukhraj",
      width: 4000,
      height: 5692,
    },
    advisor: { ...HEAD_OFFICE },
    otherPagePath: "/businesscard-hari",
  },
  {
    id: "jaxon-keelan",
    name: "Jaxon Keelan",
    role: "Financial Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["advisor"],
    image: {
      src: "/jaxon-profile.jpg",
      alt: "Portrait of Jaxon Keelan",
      width: 1166,
      height: 1284,
    },
    advisor: { ...HEAD_OFFICE },
    otherPagePath: "/businesscard-jaxon",
  },
  {
    id: "neil-alford",
    name: "Neil Alford",
    role: "Financial & Insurance Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["advisor"],
    // No portrait exists: his business card renders an empty frame where the
    // others show a photograph.
    portraitPending: true,
    advisor: { ...HEAD_OFFICE },
    otherPagePath: "/businesscard-neil",
  },
  {
    id: "shomari-hutchinson",
    name: "Shomari Hutchinson",
    role: "Financial Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["advisor"],
    image: {
      src: "/shomari-profile1.jpg",
      alt: "Portrait of Shomari Hutchinson",
      width: 1166,
      height: 1284,
    },
    advisor: { ...HEAD_OFFICE },
    otherPagePath: "/businesscard-shomari",
  },
  {
    id: "johnathan-leung",
    name: "Johnathan Leung",
    role: "Financial Advisor",
    organization: "Keybase Financial Group",
    profileTypes: ["advisor"],
    image: {
      src: "/johnathan-profile1.jpg",
      alt: "Portrait of Johnathan Leung",
      width: 668,
      height: 852,
    },
    // The only expertise data any advisor has: the three practice areas printed
    // under his name at /profile-jleung, split on the separator his page uses.
    areasOfExpertise: [
      "Wealth Management",
      "Retirement & Estate Planning",
      "Investment Strategy",
    ],
    advisor: { ...HEAD_OFFICE },
    // `otherPagePath` is deliberately unset. His landing page at /profile-jleung
    // does exist, but it prints four metrics — years of experience, clients
    // served, assets under management, client retention — that its own source
    // comment marks as placeholders to be replaced with his real numbers. The
    // directory does not link readers to unverified figures. Set this once
    // those numbers are confirmed or removed.
  },
];

/**
 * Everyone the site knows about, leadership first, then advisors. One array,
 * one record per person — a person who came to hold both roles moves between
 * the lists rather than appearing in each.
 */
export const PEOPLE: PersonProfile[] = [...LEADERSHIP, ...ADVISORS];

/** Where a person's public profile lives. One route, one URL per person. */
export const PROFILE_BASE_PATH = "/people";

export function profilePath(id: PersonId): string {
  return `${PROFILE_BASE_PATH}/${id}`;
}

/**
 * The minimum a person needs before a page about them is worth publishing.
 *
 * A name and a job title is a byline, not a profile. The bar here is an
 * approved biography of at least two paragraphs plus a published portrait —
 * which is what the leadership page already shows for six of the seven people
 * in the registry, and which the seventh (no portrait yet) does not clear.
 */
export const MIN_BIO_PARAGRAPHS = 2;

export function isProfileReady(person: PersonProfile): boolean {
  return Boolean(person.image) && (person.bio?.length ?? 0) >= MIN_BIO_PARAGRAPHS;
}

/** Turns a display name into the id form: "Dax Sukhraj" → "dax-sukhraj". */
export function personSlug(name: string): PersonId {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const BY_ID = new Map(PEOPLE.map((person) => [person.id, person]));

/**
 * Two people with the same id would silently overwrite each other in every
 * lookup below, so the registry refuses to load rather than resolve a byline to
 * the wrong person. Thrown at import time, which means at build.
 */
if (BY_ID.size !== PEOPLE.length) {
  const seen = new Set<string>();
  const duplicates = PEOPLE.map((p) => p.id).filter((id) => !seen.add(id));
  throw new Error(`Duplicate person id(s) in the people registry: ${duplicates.join(", ")}`);
}

export function getPerson(id: PersonId | undefined): PersonProfile | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Lookup by display name, for reconciling records that carry no id. */
export function getPersonByName(name: string): PersonProfile | undefined {
  return BY_ID.get(personSlug(name));
}

export function getPeopleByType(type: ProfileType): PersonProfile[] {
  return PEOPLE.filter((person) => person.profileTypes.includes(type));
}

/** Everyone whose data supports a public profile page, in registry order. */
export function getProfilePeople(): PersonProfile[] {
  return PEOPLE.filter(isProfileReady);
}

/**
 * What a byline needs and nothing more. Returns undefined for an unknown id so
 * a mistyped reference renders no byline rather than an empty one.
 */
export function getByline(id: PersonId | undefined): PersonByline | undefined {
  const person = getPerson(id);
  if (!person) return undefined;
  return {
    id: person.id,
    name: person.name,
    role: person.role,
    profilePath: isProfileReady(person) ? profilePath(person.id) : undefined,
  };
}
