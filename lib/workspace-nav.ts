/**
 * Everything the workspace chrome derives from the department registry: the
 * global sidebar sections, the shared-tools list, and the dashboard directory
 * search. Pure data and functions so the search and matching logic stay
 * testable without a browser.
 */

import { Bot, type LucideIcon } from "lucide-react";

import {
  DEPARTMENTS,
  type Department,
  type DepartmentTool,
} from "@/lib/departments";

export interface NavItem {
  label: string;
  href: string;
  /** Match only on pathname equality instead of prefix. */
  exact?: boolean;
  /** Extra pathname prefixes that mark this item active. */
  matchPaths?: readonly string[];
}

export interface NavSection {
  title?: string;
  items: readonly NavItem[];
}

/** A registry tool flattened with the department it belongs to. */
export interface DirectoryTool extends DepartmentTool {
  departmentSlug: string;
  departmentName: string;
}

export const DIRECTORY_TOOLS: readonly DirectoryTool[] = DEPARTMENTS.flatMap(
  (dept) =>
    dept.tools.map((tool) => ({
      ...tool,
      departmentSlug: dept.slug,
      departmentName: dept.name,
    })),
);

/** Pathname (no query) of a tool destination, for active-state matching. */
const toolPath = (href: string): string => href.split("?")[0];

/**
 * Destinations reachable from the sidebar's own top-level items; shared tools
 * that already have a global entry are not repeated in the shared-tools list.
 */
const GLOBAL_NAV_PATHS: readonly string[] = [
  "/dashboard",
  "/dashboard/clients",
  "/onboarding/new",
  "/onboarding/active",
  "/onboarding/completed",
];

export interface SharedTool {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  /** Names of every department that lists this destination. */
  departments: readonly string[];
}

/**
 * Tools listed by two or more departments (the first listing supplies label,
 * hint and icon), excluding destinations the global sidebar already covers,
 * plus the company-wide Internal AI workspace.
 */
export const SHARED_TOOLS: readonly SharedTool[] = (() => {
  const byHref = new Map<string, { first: DirectoryTool; departments: string[] }>();
  for (const tool of DIRECTORY_TOOLS) {
    const entry = byHref.get(tool.href);
    if (entry) {
      if (!entry.departments.includes(tool.departmentName)) {
        entry.departments.push(tool.departmentName);
      }
    } else {
      byHref.set(tool.href, { first: tool, departments: [tool.departmentName] });
    }
  }
  const shared: SharedTool[] = [];
  for (const { first, departments } of byHref.values()) {
    if (departments.length < 2) continue;
    if (GLOBAL_NAV_PATHS.includes(toolPath(first.href))) continue;
    shared.push({
      label: first.label,
      hint: first.hint,
      href: first.href,
      icon: first.icon,
      departments,
    });
  }
  shared.push({
    label: "Internal AI",
    hint: "Private AI assistant running within company infrastructure",
    href: "/internal-ai",
    icon: Bot,
    departments: ["Company-wide"],
  });
  return shared;
})();

/**
 * Pathname prefixes that mark a department active in the sidebar: its own
 * page plus every tool destination that only it lists. Shared destinations
 * are left out so a shared tool never highlights an arbitrary department.
 */
const exclusiveToolPaths = (dept: Department): readonly string[] => {
  const paths: string[] = [];
  for (const tool of dept.tools) {
    const path = toolPath(tool.href);
    if (path.startsWith("/dashboard/departments/")) continue;
    const owners = DIRECTORY_TOOLS.filter((t) => toolPath(t.href) === path);
    if (owners.every((t) => t.departmentSlug === dept.slug)) paths.push(path);
  }
  return [...new Set(paths)];
};

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/dashboard", exact: true },
      { label: "Clients", href: "/dashboard/clients" },
      {
        label: "Onboarding",
        href: "/onboarding/active",
        matchPaths: ["/onboarding"],
      },
    ],
  },
  {
    title: "Departments",
    items: DEPARTMENTS.map((dept) => ({
      label: dept.name,
      href: `/dashboard/departments/${dept.slug}`,
      matchPaths: [
        `/dashboard/departments/${dept.slug}`,
        ...exclusiveToolPaths(dept),
      ],
    })),
  },
  {
    title: "Shared tools",
    items: [
      { label: "Internal AI", href: "/internal-ai" },
      { label: "Smart Document Intake", href: "/smart-document-intake" },
    ],
  },
];

const ALL_NAV_ITEMS: readonly NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

/**
 * The sidebar item a pathname belongs to, by longest matching prefix.
 * Returns undefined for workspace pages with no sidebar relationship.
 */
export function activeNavHref(pathname: string): string | undefined {
  let best: { href: string; matchLength: number } | undefined;
  for (const item of ALL_NAV_ITEMS) {
    const paths = item.matchPaths ?? [item.href];
    for (const p of paths) {
      const matches = item.exact
        ? pathname === p
        : pathname === p || pathname.startsWith(`${p}/`);
      if (matches && (!best || p.length > best.matchLength)) {
        best = { href: item.href, matchLength: p.length };
      }
    }
  }
  return best?.href;
}

/** The label shown in the compact header for the current location. */
export function activeNavLabel(pathname: string): string | undefined {
  const href = activeNavHref(pathname);
  return ALL_NAV_ITEMS.find((item) => item.href === href)?.label;
}

export interface DirectorySearchResult {
  departments: readonly Department[];
  tools: readonly DirectoryTool[];
}

const matchesQuery = (query: string, haystacks: readonly (string | undefined)[]): boolean =>
  haystacks.some((h) => h !== undefined && h.toLowerCase().includes(query));

/**
 * Case-insensitive search over the registry — departments by name, tagline
 * and description; tools by label, hint, keywords and owning department.
 * A blank query returns every department and no tools (the default view).
 */
export function searchDirectory(rawQuery: string): DirectorySearchResult {
  const query = rawQuery.trim().toLowerCase();
  if (query === "") {
    return { departments: DEPARTMENTS, tools: [] };
  }
  const departments = DEPARTMENTS.filter((dept) =>
    matchesQuery(query, [dept.name, dept.tagline, dept.description]),
  );
  const tools = DIRECTORY_TOOLS.filter((tool) =>
    matchesQuery(query, [
      tool.label,
      tool.hint,
      tool.departmentName,
      ...(tool.keywords ?? []),
    ]),
  );
  return { departments, tools };
}
