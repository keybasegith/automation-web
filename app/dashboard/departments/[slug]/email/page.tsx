import { notFound } from "next/navigation";
import DepartmentMailbox from "@/components/department-email/DepartmentMailbox";
import { PageHeader } from "@/components/workspace/PageHeader";
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
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: dept.name, href: `/dashboard/departments/${dept.slug}` },
          { label: "Mailbox" },
        ]}
        eyebrow={dept.name}
        title="Mailbox"
        description={`Send and review email for the ${dept.name.toLowerCase()} team. Until a live email API is connected, messages are stored locally.`}
      />

      <DepartmentMailbox
        departmentSlug={dept.slug}
        departmentName={dept.name}
        defaultFrom={`${dept.slug}@keybase.com`}
      />
    </div>
  );
}
