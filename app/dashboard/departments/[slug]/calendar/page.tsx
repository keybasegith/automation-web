import { notFound } from "next/navigation";
import ContentCalendar from "@/components/department-calendar/ContentCalendar";
import { PageHeader } from "@/components/workspace/PageHeader";
import { getDepartment } from "@/lib/departments";

// Behind authentication and reading live data: rendered per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = getDepartment(slug);
  return {
    title: dept ? `${dept.name} Content Calendar · Keybase` : "Content Calendar",
  };
}

export default async function DepartmentCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = getDepartment(slug);
  if (!dept) notFound();

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: dept.name, href: `/dashboard/departments/${dept.slug}` },
          { label: "Content Calendar" },
        ]}
        eyebrow={dept.name}
        title="Content Calendar"
        description="Plan what goes out and when, keep the files and reference links with the piece, and move it through approval and compliance review in one place."
        className="mb-6"
      />

      <ContentCalendar departmentSlug={dept.slug} departmentName={dept.name} />
    </div>
  );
}
