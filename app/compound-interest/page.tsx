import CompoundInterestCalculator from "@/components/compound-interest/CompoundInterestCalculator";

export const dynamic = "force-dynamic";

export default function CompoundInterestPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Finance Intelligence
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Compound Interest Calculator
        </h2>
        <p className="text-sm text-slate-500">
          See the power of compounding over time. Adjust your inputs and watch
          your wealth grow.
        </p>
      </header>

      <CompoundInterestCalculator />
    </div>
  );
}
