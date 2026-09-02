import { notFound } from "next/navigation";

import PackageWorkspace from "@/components/financial-statements/PackageWorkspace";
import { toPackageDto } from "@/lib/financial-statements/api";
import { loadPackage } from "@/lib/financial-statements/service";

export const dynamic = "force-dynamic";

export default async function StatementPackagePage(props: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = await props.params;
  const view = await loadPackage(packageId);
  if (!view) notFound();

  return (
    <div className="mx-auto max-w-7xl">
      <PackageWorkspace
        initial={toPackageDto(
          view.statementPackage,
          view.version.version,
          view.version.createdAt,
          view.result
        )}
      />
    </div>
  );
}
