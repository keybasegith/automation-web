import { ScanSearch } from "lucide-react";

import DailySettlementTool from "@/components/bp-settlement/DailySettlementTool";
import { PageHeader } from "@/components/workspace/PageHeader";

export const dynamic = "force-static";

export const metadata = {
  title: "Daily Settlement Check · Business Processing · Keybase",
};

export default function DailySettlementPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: "Business Processing",
            href: "/dashboard/departments/business-processing",
          },
          { label: "Daily Settlement Check" },
        ]}
        title="Daily Settlement Check"
        description="Upload Fundserv and Winfund exports to identify Buy and Sell differences before settlement."
        icon={ScanSearch}
        className="mb-7"
      />

      <DailySettlementTool />
    </div>
  );
}
