import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";
import { DEPARTMENTS, getDepartment } from "@/lib/departments";

export const dynamic = "force-static";

export function generateStaticParams() {
  return DEPARTMENTS.map((d) => ({ slug: d.slug }));
}

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

  const Icon = dept.icon;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All departments
      </Link>

      <header className="mb-10 flex items-start gap-5">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${dept.accent}`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-400">
            {dept.tagline}
          </p>
          <h2 className="font-display text-[34px] font-semibold leading-tight tracking-tight text-slate-900">
            {dept.name}
          </h2>
          <p className="max-w-2xl text-[15px] text-slate-500">
            {dept.description}
          </p>
        </div>
      </header>

      <section className="mb-8">
        <header className="mb-4">
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
            Mailbox
          </h3>
        </header>
        <Link
          href={`/dashboard/departments/${dept.slug}/email`}
          className="group flex items-center gap-4 rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[var(--hairline-strong)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold tracking-tight text-slate-900">
              Email
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Send and review messages for the {dept.name.toLowerCase()} team.
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
        </Link>
      </section>

      <section>
        <header className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">
            Tools
          </h3>
          <span className="text-[12px] text-slate-500">
            {dept.tools.length} available
          </span>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dept.tools.map((tool) => {
            const ToolIcon = tool.icon;
            return (
              <Link
                key={tool.href + tool.label}
                href={tool.href}
                className="group relative flex items-start gap-4 rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-[var(--hairline-strong)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <ToolIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold tracking-tight text-slate-900">
                    {tool.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                    {tool.hint}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
