// Brand, copy, routes, and scoring constants for the World Cup Challenge.
// Single source of truth for event-wide values used across pages.

export const BASE = "/world-cup-challenge";

export const EVENT = {
  title: "Argosy / Keybase World Cup Challenge 2026",
  shortTitle: "World Cup Challenge 2026",
  tagline: "Stronger Together: Celebrating Canada Through Sport",
  startDate: "June 11, 2026",
  endDate: "July 19, 2026",
  entryFee: 20,
  finalDate: "July 19, 2026",
} as const;

export const POOL_SPLIT = [
  { place: "1st place", pct: 40 },
  { place: "2nd place", pct: 30 },
  { place: "3rd place", pct: 20 },
  { place: "4th place", pct: 10 },
] as const;

// Internal/legal guardrail copy reused wherever the pool is mentioned.
export const POOL_DISCLAIMER =
  "The entry fee, pool structure, prize distribution, and participant eligibility must be reviewed and approved internally before launch to ensure compliance with all applicable company, contest, and local rules. This platform does not process payments or issue payouts.";

export const SCORING = {
  match: {
    exactScore: 8,
    correctResult: 3,
    goalDifferenceBonus: 2,
  },
  canada: {
    resultPerGame: 5,
    canadaScorePerGame: 5,
    opponentScorePerGame: 5,
    totalScored: 10,
    totalConceded: 10,
  },
  final: {
    oneFinalist: 10,
    bothFinalists: 25,
    champion: 30,
  },
} as const;

// Public navigation (header).
export const NAV_LINKS = [
  { label: "Home", href: BASE },
  { label: "Leaderboard", href: `${BASE}/leaderboard` },
  { label: "Daily Tracker", href: `${BASE}/tracker` },
  { label: "Rules & Scoring", href: `${BASE}/rules` },
] as const;

export const ADMIN_NAV: { label: string; href: string; exact?: boolean }[] = [
  { label: "Overview", href: `${BASE}/admin`, exact: true },
  { label: "Matches", href: `${BASE}/admin/matches` },
  { label: "Results", href: `${BASE}/admin/results` },
  { label: "Participants", href: `${BASE}/admin/participants` },
  { label: "Leaderboard", href: `${BASE}/leaderboard` },
  { label: "Announcements", href: `${BASE}/admin/announcements` },
  { label: "Exports", href: `${BASE}/admin/exports` },
] as const;

// A short, sensible default list of national teams for prediction selects.
export const TEAMS = [
  "Argentina", "Australia", "Belgium", "Brazil", "Canada", "Croatia",
  "Ecuador", "England", "France", "Germany", "Ghana", "Italy", "Japan",
  "Mexico", "Morocco", "Netherlands", "Norway", "Portugal", "Senegal",
  "South Korea", "Spain", "Switzerland", "USA", "Uruguay",
].sort();
