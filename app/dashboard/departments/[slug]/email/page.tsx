import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import DepartmentMailbox from "@/components/department-email/DepartmentMailbox";
import { DEPARTMENTS, getDepartment } from "@/lib/departments";

export const dynamic = "force-dynamic";

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
    title: dept ? `${dept.name} Mailbox · Keybase` : "Mailbox",
  };
}

export default async function DepartmentMailboxPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = getDepartment(slug);
  if (!dept) notFound();

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href={`/dashboard/departments/${dept.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {dept.name}
      </Link>

      <header className="mb-8">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-400">
          {dept.name}
        </p>
        <h2 className="font-display mt-1 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
          Mailbox
        </h2>
        <p className="mt-1.5 text-[14px] text-slate-500">
          Send and review email for the {dept.name.toLowerCase()} team. Until a
          live email API is connected, messages are stored locally.
        </p>
      </header>

      <DepartmentMailbox
        departmentSlug={dept.slug}
        departmentName={dept.name}
        defaultFrom={`${dept.slug}@keybase.com`}
      />
    </div>
  );
}
