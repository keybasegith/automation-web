import { FileSearch } from "lucide-react";

import DiscrepancyDetectorTool from "@/components/discrepancy-detector/DiscrepancyDetectorTool";
import { PageHeader } from "@/components/workspace/PageHeader";

export const dynamic = "force-static";

export const metadata = {
  title: "NAAF / CRQ Discrepancy Detector · Keybase",
  description:
    "Compare a NAAF against its CRQ, list the deficiencies, and draft the advisor email.",
};

export default function DiscrepancyDetectorPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Compliance", href: "/dashboard/departments/compliance" },
          { label: "NAAF / CRQ Discrepancy Detector" },
        ]}
        title="NAAF / CRQ Discrepancy Detector"
        description="Drop a new account's NAAF and CRQ, confirm what was read off the forms, and get the itemised deficiency list with a drafted advisor email. Every finding cites the rule that produced it."
        icon={FileSearch}
        className="mb-7"
      />

      <DiscrepancyDetectorTool />
    </div>
  );
}
