import { Scale } from "lucide-react";

import NetSettlementTool from "@/components/net-settlement/NetSettlementTool";
import { PageHeader } from "@/components/workspace/PageHeader";

export const dynamic = "force-static";

export const metadata = {
  title: "Net Settlement Reconciliation · Keybase",
};

export default function NetSettlementPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: "Business Processing",
            href: "/dashboard/departments/business-processing",
          },
          { label: "Net Settlement Reconciliation" },
        ]}
        title="Net Settlement Reconciliation"
        description="Drop the Fundserv and Winfund files to compare transactions and identify required adjustments."
        icon={Scale}
        className="mb-7"
      />

      <NetSettlementTool />
    </div>
  );
}
