import { describe, expect, it } from "vitest";

import {
  DEPARTMENTS,
  departmentToolGroups,
  getDepartment,
} from "@/lib/departments";
import {
  DIRECTORY_TOOLS,
  NAV_SECTIONS,
  SHARED_TOOLS,
  activeNavHref,
  activeNavLabel,
  searchDirectory,
} from "@/lib/workspace-nav";

describe("department registry", () => {
  it("includes the advisor portal alongside the existing departments", () => {
    expect(DEPARTMENTS.map((d) => d.slug)).toEqual([
      "advisor-portal",
      "finance",
      "business-processing",
      "compliance",
      "financial-advisors",
      "sales",
      "it",
      "insurance-sales",
      "marketing",
      "senior-management",
    ]);
  });

  it("gives every tool a stable id unique within its department", () => {
    for (const dept of DEPARTMENTS) {
      const ids = dept.tools.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("only uses categories a department declares", () => {
    for (const dept of DEPARTMENTS) {
      for (const tool of dept.tools) {
        if (tool.category) {
          expect(dept.categories ?? []).toContain(tool.category);
        }
      }
    }
  });

  it("resolves departments by slug and rejects unknown slugs", () => {
    expect(getDepartment("compliance")?.name).toBe("Compliance");
    expect(getDepartment("nope")).toBeUndefined();
  });

  it("groups tools by the declared category order without losing any", () => {
    const bp = getDepartment("business-processing")!;
    const groups = departmentToolGroups(bp);
    expect(groups.map((g) => g.category)).toEqual([
      "Intake & forms",
      "Approved packages",
      "Settlement",
    ]);
    const grouped = groups.flatMap((g) => g.tools.map((t) => t.id));
    expect(grouped.sort()).toEqual(bp.tools.map((t) => t.id).sort());
  });

  it("renders a single flat group for departments without categories", () => {
    const it_ = getDepartment("it")!;
    const groups = departmentToolGroups(it_);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBeUndefined();
    expect(groups[0].tools.map((tool) => tool.id)).toEqual(["advisor-portal", "audit-logs", "automation-runs"]);
  });
});

describe("global navigation", () => {
  it("lists every department in the Departments section", () => {
    const deptSection = NAV_SECTIONS.find((s) => s.title === "Departments")!;
    expect(deptSection.items.map((i) => i.href)).toEqual(
      DEPARTMENTS.map((d) => d.href ?? `/dashboard/departments/${d.slug}`),
    );
  });

  it("marks Overview active only on the dashboard home", () => {
    expect(activeNavHref("/dashboard")).toBe("/dashboard");
    expect(activeNavHref("/dashboard/clients")).toBe("/dashboard/clients");
    expect(activeNavHref("/dashboard/clients/abc-id")).toBe("/dashboard/clients");
    // Import is listed only by Sales, so the more specific match wins.
    expect(activeNavHref("/dashboard/clients/import")).toBe(
      "/dashboard/departments/sales",
    );
  });

  it("maps a department page and its exclusive tools to that department", () => {
    expect(activeNavHref("/dashboard/departments/finance")).toBe(
      "/dashboard/departments/finance",
    );
    expect(activeNavHref("/transcript-formatter")).toBe(
      "/dashboard/departments/finance",
    );
    expect(activeNavHref("/dashboard/form-processing/upload-naaf")).toBe(
      "/dashboard/departments/compliance",
    );
    expect(activeNavLabel("/net-settlement")).toBe("Business Processing");
  });

  it("never maps a shared destination to a single department", () => {
    // Audit logs belong to Compliance, IT and Senior Management alike.
    expect(activeNavHref("/dashboard/audit")).toBeUndefined();
    // Onboarding is shared, but the global Onboarding item covers it.
    expect(activeNavLabel("/onboarding/new")).toBe("Onboarding");
    expect(activeNavLabel("/onboarding/abc123/wizard")).toBe("Onboarding");
  });

  it("does not treat sibling prefixes as matches", () => {
    expect(activeNavHref("/dashboard/clients-archive")).toBeUndefined();
  });
});

describe("shared tools", () => {
  it("contains only destinations listed by two or more departments, plus Internal AI", () => {
    for (const tool of SHARED_TOOLS) {
      if (tool.href === "/internal-ai") continue;
      const owners = new Set(
        DIRECTORY_TOOLS.filter((t) => t.href.split("?")[0] === tool.href.split("?")[0]).map(
          (t) => t.departmentSlug,
        ),
      );
      expect(owners.size).toBeGreaterThanOrEqual(2);
    }
    expect(SHARED_TOOLS.some((t) => t.href === "/internal-ai")).toBe(true);
  });

  it("does not repeat destinations the global sidebar already covers", () => {
    const hrefs = SHARED_TOOLS.map((t) => t.href);
    expect(hrefs).not.toContain("/dashboard/clients");
    expect(hrefs).not.toContain("/onboarding/new");
  });
});

describe("directory search", () => {
  it("returns all departments and no tools for a blank query", () => {
    const result = searchDirectory("   ");
    expect(result.departments).toHaveLength(DEPARTMENTS.length);
    expect(result.tools).toHaveLength(0);
  });

  it("matches tools by label, case-insensitively", () => {
    const { tools } = searchDirectory("TRANSCRIPT");
    expect(tools.map((t) => t.href)).toContain("/transcript-formatter");
  });

  it("matches tools by keyword", () => {
    const { tools } = searchDirectory("fundserv");
    const hrefs = tools.map((t) => t.href);
    expect(hrefs).toContain("/net-settlement");
    expect(hrefs).toContain("/bp-dailysettlement");
  });

  it("matches tools by owning department name", () => {
    const { tools } = searchDirectory("insurance");
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((t) => t.departmentName === "Insurance Sales")).toBe(true);
  });

  it("matches departments by name or tagline", () => {
    expect(searchDirectory("oversight").departments.map((d) => d.slug)).toContain(
      "senior-management",
    );
  });

  it("finds nothing for gibberish", () => {
    const result = searchDirectory("zzzznope");
    expect(result.departments).toHaveLength(0);
    expect(result.tools).toHaveLength(0);
  });
});
