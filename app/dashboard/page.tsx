import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { DASHBOARD_CARDS } from "@/lib/dashboard-cards";

export const dynamic = "force-dynamic";

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatLongDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export default function DashboardHomePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-10">
        <p className="text-[13px] text-slate-500">{formatLongDate(new Date())}</p>
        <h2 className="font-display mt-1 text-[34px] font-semibold leading-tight tracking-tight text-slate-900">
          {greeting()}
        </h2>
        <p className="mt-1.5 text-[15px] text-slate-500">
          Choose a department to see the tools available to that team.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DASHBOARD_CARDS.map((card) => (
          <DashboardCard key={card.key} card={card} />
        ))}
      </div>
    </div>
  );
}
