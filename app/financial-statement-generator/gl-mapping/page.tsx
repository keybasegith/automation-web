import Link from "next/link";

import GlMappingManager from "@/components/financial-statements/GlMappingManager";
import { toMappingDto } from "@/lib/financial-statements/api";
import { store } from "@/lib/financial-statements/repo";

export const dynamic = "force-dynamic";

export default async function GlMappingPage() {
  const [rules, mappingVersion] = await Promise.all([
    store.listMappings(),
    store.mappingVersion(),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Financial Statement Generator
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">GL Mapping</h2>
        <p className="max-w-3xl text-sm text-slate-500">
          Which accounts feed which statement line. An account with no mapping is never guessed at —
          it becomes a blocking exception until someone places it. Mapping version{" "}
          <span className="font-mono">{mappingVersion}</span> · {rules.length} rules.
        </p>
        <p className="mt-1 text-sm">
          <Link href="/financial-statement-generator" className="text-brand hover:underline">
            ← Back to statement packages
          </Link>
        </p>
      </header>

      <GlMappingManager initial={rules.map(toMappingDto)} />
    </div>
  );
}
