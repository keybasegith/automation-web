/**
 * /internal-ai — the Internal AI assistant.
 *
 * A server component so the model status is read from the server's own
 * configuration rather than asserted by the browser: the page cannot show a
 * connected model unless a provider is genuinely configured. It renders inside
 * AppShell (see layout.tsx), which is what gates the route for signed-in staff,
 * exactly as every other dashboard tool is gated.
 */

import { notFound } from "next/navigation";

import { InternalAiWorkspace } from "@/components/internal-ai/InternalAiWorkspace";
import { LocalAiBadge, ModelStatusBadge } from "@/components/internal-ai/ModelStatusBadge";
import { getInternalAiConfig } from "@/lib/internal-ai/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Internal AI Assistant · Keybase",
  robots: { index: false, follow: false },
};

export default function InternalAiPage() {
  const config = getInternalAiConfig();
  if (!config.enabled) notFound();

  // Derived from configuration, never asserted by copy. "configured" is as far
  // as config alone can honestly go: whether the model actually answers is
  // proven by a request, not by an environment variable, so the page does not
  // probe the inference server on every load to claim a green light.
  const selected = config.localInference?.model;
  const modelStatus = config.providerMode === "local" ? "configured" : "not-connected";
  const modelLabel =
    config.providerMode === "local"
      ? (selected?.displayName ?? "Local model")
      : "Model not connected";

  return (
    // The shell's header is 3.5rem and its main padding 4rem; claiming the rest
    // of the viewport keeps the composer at the bottom and scrolls the
    // transcript rather than the page.
    <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-5xl flex-col">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-slate-900">
            Internal AI Assistant
          </h2>
          <p className="text-[14px] text-slate-500">
            Private AI for internal company use
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LocalAiBadge />
          <ModelStatusBadge status={modelStatus} label={modelLabel} />
        </div>
      </header>

      <InternalAiWorkspace
        maxMessageLength={config.maxMessageLength}
        attachmentLimits={config.attachments}
      />
    </div>
  );
}
