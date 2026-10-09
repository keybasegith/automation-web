import SmartDocumentCenter from "@/components/smart-document-intake/SmartDocumentCenter";
import { Breadcrumbs } from "@/components/workspace/Breadcrumbs";

export const dynamic = "force-dynamic";

export default function SmartDocumentCenterPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Smart Document Center" },
        ]}
      />
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Internal — Employee Use Only
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Smart Document Center
        </h1>
        <p className="text-sm text-slate-500">
          Separate combined onboarding packages or merge multiple client
          documents into one organized PDF package for review.
        </p>
      </header>

      <SmartDocumentCenter />
    </div>
  );
}
