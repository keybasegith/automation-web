/**
 * What the dashboard home grid shows.
 *
 * Every department becomes a card, and standalone workspaces that are not a
 * department — tools the whole company shares — are appended after them. Both
 * kinds render through the same component, so a card cannot drift visually
 * from its neighbours.
 */

import { Bot, type LucideIcon } from "lucide-react";

import { DEPARTMENTS, type Department } from "@/lib/departments";

export interface DashboardCardData {
  key: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind gradient + text colour for the icon tile. */
  accent: string;
  href: string;
  /** Bottom-left line. For a department, its tool count. */
  footnote: string;
}

const fromDepartment = (dept: Department): DashboardCardData => ({
  key: `department:${dept.slug}`,
  name: dept.name,
  tagline: dept.tagline,
  description: dept.description,
  icon: dept.icon,
  accent: dept.accent,
  href: `/dashboard/departments/${dept.slug}`,
  footnote: `${dept.tools.length} tool${dept.tools.length === 1 ? "" : "s"}`,
});

/** Company-wide workspaces that sit alongside the departments. */
const STANDALONE_CARDS: readonly DashboardCardData[] = [
  {
    key: "internal-ai",
    name: "Internal AI",
    tagline: "Private assistant",
    description:
      "Private AI assistant running within company infrastructure.",
    icon: Bot,
    accent: "from-teal-500/15 to-teal-500/5 text-teal-700",
    href: "/internal-ai",
    // Says what is true today; it changes when a model is actually connected.
    footnote: "Model not connected",
  },
];

export const DASHBOARD_CARDS: readonly DashboardCardData[] = [
  ...DEPARTMENTS.map(fromDepartment),
  ...STANDALONE_CARDS,
];
