import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ContentCalendar from "@/components/department-calendar/ContentCalendar";
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
      <Link
        href={`/dashboard/departments/${dept.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {dept.name}
      </Link>

      <header className="mb-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-400">
          {dept.name}
        </p>
        <h2 className="font-display mt-1 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">
          Content Calendar
        </h2>
        <p className="mt-1.5 max-w-2xl text-[14px] text-slate-500">
          Plan what goes out and when, keep the files and reference links with the
          piece, and move it through approval and compliance review in one place.
        </p>
      </header>

      <ContentCalendar departmentSlug={dept.slug} departmentName={dept.name} />
    </div>
  );
}
