import MonthlyAccountAnalysisWorkflow from "@/components/finance-intelligence/MonthlyAccountAnalysisWorkflow";
import { Breadcrumbs } from "@/components/workspace/Breadcrumbs";

export const dynamic = "force-dynamic";

export default function FinanceIntelligencePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Finance", href: "/dashboard/departments/finance" },
          { label: "Monthly Account Analysis" },
        ]}
      />
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Finance Intelligence
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Monthly Account Analysis
        </h1>
        <p className="text-sm text-slate-500">
          Generate account-level monthly analysis from Sage 300 exports — fully
          on-premise, no external AI services involved.
        </p>
      </header>

      <MonthlyAccountAnalysisWorkflow />
    </div>
  );
}
