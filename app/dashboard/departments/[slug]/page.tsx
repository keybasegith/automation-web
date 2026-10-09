import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Mail } from "lucide-react";

import { Button } from "@/components/workspace/Button";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ToolCard } from "@/components/workspace/ToolCard";
import { departmentToolGroups, getDepartment } from "@/lib/departments";

// Rendered per request so the shared-workspace chrome stays fresh.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = getDepartment(slug);
  return {
    title: dept ? `${dept.name} · Keybase` : "Department",
  };
}

export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = getDepartment(slug);
  if (!dept) notFound();

  const groups = departmentToolGroups(dept);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: dept.name },
        ]}
        eyebrow={dept.tagline}
        title={dept.name}
        description={dept.description}
        icon={dept.icon}
        actions={
          dept.primaryAction ? (
            <Button href={dept.primaryAction.href} variant="primary">
              {dept.primaryAction.label}
            </Button>
          ) : undefined
        }
        className="mb-10"
      />

      {groups.map((group) => (
        <section key={group.category ?? "tools"} className="mb-8">
          <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-slate-900">
            {group.category ?? "Tools"}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.tools.map((tool) => (
              <ToolCard
                key={tool.id}
                label={tool.label}
                hint={tool.hint}
                href={tool.href}
                icon={tool.icon}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="mb-8">
        <h2 className="mb-4 text-[15px] font-semibold tracking-tight text-slate-900">
          Communication
        </h2>
        <Link
          href={`/dashboard/departments/${dept.slug}/email`}
          className="group flex max-w-2xl items-center gap-4 rounded-xl border border-[var(--hairline)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[var(--hairline-strong)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Mail aria-hidden className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-tight text-slate-900">
              Department mailbox
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Send and review messages for the {dept.name.toLowerCase()} team.
            </p>
          </div>
          <ArrowUpRight
            aria-hidden
            className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500"
          />
        </Link>
      </section>
    </div>
  );
}
