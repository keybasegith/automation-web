/**
 * Model status, stated honestly.
 *
 * Three states, and the distinction between the last two matters:
 *
 *   not-connected — no inference server is configured. The mock answers.
 *   configured    — a server and model are configured, but nothing has been
 *                   asked of them yet. We do not claim a working model on the
 *                   strength of an environment variable; the connection is
 *                   proven by the first message, not by config.
 *   connected     — a provider reported that a real model answered.
 *
 * The component takes a state and a label. It knows nothing about which models
 * exist, which is the registry's business.
 */

import { Circle } from "lucide-react";

export type ModelStatus = "not-connected" | "configured" | "connected";

const TONE: Record<ModelStatus, { badge: string; dot: string; title: string }> = {
  "not-connected": {
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "fill-slate-400 text-slate-400",
    title: "No local inference server is configured.",
  },
  configured: {
    badge: "bg-brand-soft text-brand ring-brand/15",
    dot: "fill-brand text-brand",
    title:
      "A local model is configured. The connection is verified when you send your first message.",
  },
  connected: {
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "fill-emerald-500 text-emerald-500",
    title: "A local model answered.",
  },
};

export function ModelStatusBadge({
  status,
  label,
}: {
  status: ModelStatus;
  label: string;
}) {
  const tone = TONE[status];
  return (
    <span
      title={tone.title}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${tone.badge}`}
    >
      <Circle aria-hidden="true" className={`h-2 w-2 ${tone.dot}`} />
      {label}
      <span className="sr-only">. {tone.title}</span>
    </span>
  );
}

/** The environment badge: this assistant runs on company infrastructure. */
export function LocalAiBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand ring-1 ring-inset ring-brand/15">
      Local AI
    </span>
  );
}
