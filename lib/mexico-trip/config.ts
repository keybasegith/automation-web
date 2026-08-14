/**
 * Single source of truth for the Huatulco 2026 qualifiers trip.
 *
 * Every string a colleague reads on /mexico-trip lives here so the copy can be
 * updated without touching layout, and so the landing page, the .ics download,
 * and the RSVP API all agree on dates, destination, and trip slug.
 */

export const BASE = "/mexico-trip";

/** Identifies this trip's rows in `trip_rsvps`. Bump for a future year. */
export const TRIP_SLUG = "huatulco-2026";

export const TRIP = {
  slug: TRIP_SLUG,
  eyebrow: "Save the date",
  greeting: "Dear fellow colleagues — ¿Cómo está?",
  title: "Huatulco, Mexico",
  resort: "Secrets Huatulco Resort & Spa",
  region: "Bahías de Huatulco, Oaxaca",
  dateLabel: "November 21–28, 2026",
  nights: "7 nights",
  /** Local calendar dates. DTEND in the .ics is the exclusive day after. */
  startDate: "2026-11-21",
  endDate: "2026-11-28",
  /** Deadline shown beside the RSVP form. */
  rsvpByLabel: "Please reply by September 30, 2026",
  heroVideo: "/mexico-trip.mp4",
  /** Auto-sliding gallery under the invitation. Missing files are skipped. */
  photos: [
    "/mexico-trip1.jpg",
    "/mexico-trip2.jpg",
    "/mexico-trip3.jpg",
    "/mexico-trip4.jpg",
    "/mexico-trip5.jpg",
  ],
  tagline: "You worked for it. You earned it. Now it's time to celebrate it.",
  intro:
    "I trust you are having an enjoyable summer of warm weather, great outdoors and lots of activities. For planning purposes and time availability, here are the dates and location we are considering.",
  promise:
    "Get ready for an unforgettable week of relaxation, connection and celebration.",
  note: "More details are coming soon, and a formal invitation will follow.",
} as const;

/** The four-beat teaser from the save-the-date note. */
export const PILLARS = [
  {
    number: "01",
    title: "Sunshine",
    body: "Roughly 330 days of sun a year on Oaxaca's Pacific coast. Late November is the sweet spot — dry, warm, and golden from morning to last light.",
  },
  {
    number: "02",
    title: "Ocean",
    body: "Nine bays and thirty-six beaches of protected coastline. Swim, snorkel, sail, or simply claim a lounger and let the week slow down.",
  },
  {
    number: "03",
    title: "Celebration",
    body: "A week built around the people you did it with — long dinners, a proper celebration night, and the kind of conversations the office never makes room for.",
  },
  {
    number: "04",
    title: "A very special destination",
    body: "Secrets Huatulco Resort & Spa — adults-only, beachfront, Unlimited-Luxury®. Everything handled, so nothing is left for you to manage.",
  },
] as const;

/** Numbers that make the destination feel concrete rather than abstract. */
export const STATS = [
  { value: "7", label: "nights" },
  { value: "9", label: "bays" },
  { value: "36", label: "beaches" },
  { value: "28°C", label: "average November high" },
] as const;

/** What the resort covers — the "nothing left to manage" proof points. */
export const INCLUDED = [
  {
    icon: "hotel",
    title: "Beachfront suite",
    body: "Adults-only, ocean-view accommodation with a private terrace or plunge pool.",
  },
  {
    icon: "utensils",
    title: "Dining & drinks included",
    body: "Nine restaurants, no reservations required, no wristbands, no bill at the end.",
  },
  {
    icon: "flower",
    title: "Spa & wellness",
    body: "The Secrets Spa hydrotherapy circuit, fitness studio, and daily wellness sessions.",
  },
  {
    icon: "waves",
    title: "Beach & water sports",
    body: "Snorkelling, kayaks, paddleboards, catamaran sailing, and the pools between.",
  },
  {
    icon: "party",
    title: "Nightly entertainment",
    body: "Live music, themed evenings, and a beach club that runs well past dinner.",
  },
  {
    icon: "plane",
    title: "Travel handled",
    body: "Group flights, airport transfers, and on-site coordination arranged for you.",
  },
] as const;

/** A day-shape sketch — deliberately loose while details are still forming. */
export const WEEK = [
  {
    day: "Sat 21",
    title: "Arrival & welcome",
    body: "Land in Huatulco, transfer to the resort, and meet everyone at the welcome reception on the beach.",
  },
  {
    day: "Sun 22 – Wed 25",
    title: "Days at leisure",
    body: "Yours to spend. Bay tours, coffee plantations, waterfalls, dive sites, spa mornings — or absolutely nothing at all.",
  },
  {
    day: "Thu 26",
    title: "The celebration",
    body: "The evening this whole trip is built around: dinner, recognition, and a toast to the year you delivered.",
  },
  {
    day: "Fri 27 – Sat 28",
    title: "Wind down & farewell",
    body: "One more slow morning on the sand, a farewell brunch, and transfers home.",
  },
] as const;

/** Answers the questions people ask before they'll commit. */
export const FAQ = [
  {
    q: "Who is covered?",
    a: "You qualified — your trip is on us. The invitation is personal to qualifiers, so please don't forward this link.",
  },
  {
    q: "Do I need a passport?",
    a: "Yes. Mexico requires a passport valid for the duration of your stay. If yours expires before mid-2027, start the renewal now — processing gets slow in the fall.",
  },
  {
    q: "How much time off do I need?",
    a: "The trip covers a US Thanksgiving week. Plan for the full November 21–28 window, plus travel on either end.",
  },
  {
    q: "What if my plans change?",
    a: "Reply with your best answer today and tell us in the notes. You can update your response any time by submitting the form again with the same email.",
  },
] as const;

export const ATTENDING_OPTIONS = [
  {
    value: "yes",
    label: "Yes — count me in",
    hint: "Save my spot in Huatulco.",
  },
  {
    value: "maybe",
    label: "Interested — confirming dates",
    hint: "Keep me on the list while I check.",
  },
  {
    value: "no",
    label: "Unable to attend",
    hint: "I'll have to celebrate from home.",
  },
] as const;

export type AttendingValue = (typeof ATTENDING_OPTIONS)[number]["value"];

export const ATTENDING_VALUES: readonly AttendingValue[] =
  ATTENDING_OPTIONS.map((o) => o.value);
