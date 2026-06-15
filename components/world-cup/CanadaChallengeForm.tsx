"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Maple } from "./icons";
import type { CanadaChallenge, CanadaResult } from "@/lib/world-cup/types";
import { Alert, Badge, Button, Field, Input, Select } from "./ui";

export interface CanadaGameMeta {
  opponent: string;
  date?: string;
}

export type CanadaChallengePayload = {
  canada_game_1_result: CanadaResult | null;
  canada_game_1_canada_goals: number | null;
  canada_game_1_opponent_goals: number | null;
  canada_game_2_result: CanadaResult | null;
  canada_game_2_canada_goals: number | null;
  canada_game_2_opponent_goals: number | null;
  canada_game_3_result: CanadaResult | null;
  canada_game_3_canada_goals: number | null;
  canada_game_3_opponent_goals: number | null;
  total_canada_goals_scored: number | null;
  total_canada_goals_conceded: number | null;
};

const RESULTS: { value: CanadaResult; label: string }[] = [
  { value: "W", label: "Canada win" },
  { value: "D", label: "Draw" },
  { value: "L", label: "Canada loss" },
];

function numOrNull(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function CanadaChallengeForm({
  games,
  existing,
  locked,
  points,
  onSave,
}: {
  games: CanadaGameMeta[];
  existing?: CanadaChallenge | null;
  locked: boolean;
  points?: number;
  onSave: (payload: CanadaChallengePayload) => Promise<void>;
}) {
  const [form, setForm] = useState(() => ({
    g1r: existing?.canada_game_1_result ?? "",
    g1c: existing?.canada_game_1_canada_goals?.toString() ?? "",
    g1o: existing?.canada_game_1_opponent_goals?.toString() ?? "",
    g2r: existing?.canada_game_2_result ?? "",
    g2c: existing?.canada_game_2_canada_goals?.toString() ?? "",
    g2o: existing?.canada_game_2_opponent_goals?.toString() ?? "",
    g3r: existing?.canada_game_3_result ?? "",
    g3c: existing?.canada_game_3_canada_goals?.toString() ?? "",
    g3o: existing?.canada_game_3_opponent_goals?.toString() ?? "",
    ts: existing?.total_canada_goals_scored?.toString() ?? "",
    tc: existing?.total_canada_goals_conceded?.toString() ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const gameRows = [
    { idx: 1, r: "g1r", c: "g1c", o: "g1o" },
    { idx: 2, r: "g2r", c: "g2c", o: "g2o" },
    { idx: 3, r: "g3r", c: "g3c", o: "g3o" },
  ] as const;

  async function submit() {
    setMsg(null);
    setSaving(true);
    try {
      await onSave({
        canada_game_1_result: (form.g1r || null) as CanadaResult | null,
        canada_game_1_canada_goals: numOrNull(form.g1c),
        canada_game_1_opponent_goals: numOrNull(form.g1o),
        canada_game_2_result: (form.g2r || null) as CanadaResult | null,
        canada_game_2_canada_goals: numOrNull(form.g2c),
        canada_game_2_opponent_goals: numOrNull(form.g2o),
        canada_game_3_result: (form.g3r || null) as CanadaResult | null,
        canada_game_3_canada_goals: numOrNull(form.g3c),
        canada_game_3_opponent_goals: numOrNull(form.g3o),
        total_canada_goals_scored: numOrNull(form.ts),
        total_canada_goals_conceded: numOrNull(form.tc),
      });
      setMsg({ tone: "success", text: "Canada Pride Challenge saved." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-bold text-[#0B1F3A]">
          <Maple className="h-5 w-5 text-[#C8102E]" /> Canada Pride Challenge
        </h3>
        {points != null && <Badge tone="green">{points} pts earned</Badge>}
      </div>

      {locked && (
        <Alert tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-4 w-4" /> This challenge is locked — predictions can no longer be changed.
          </span>
        </Alert>
      )}

      <div className="space-y-4">
        {gameRows.map((row, i) => (
          <div key={row.idx} className="rounded-xl border border-gray-200 p-4">
            <p className="mb-3 text-sm font-semibold text-[#0B1F3A]">
              Game {row.idx}: Canada vs {games[i]?.opponent ?? "TBD"}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Result" htmlFor={`${row.r}`}>
                <Select
                  id={row.r}
                  value={form[row.r]}
                  disabled={locked}
                  onChange={(e) => set(row.r, e.target.value)}
                >
                  <option value="">Select…</option>
                  {RESULTS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Canada goals" htmlFor={row.c}>
                <Input
                  id={row.c}
                  inputMode="numeric"
                  disabled={locked}
                  value={form[row.c]}
                  onChange={(e) => set(row.c, e.target.value.replace(/[^0-9]/g, ""))}
                />
              </Field>
              <Field label="Opponent goals" htmlFor={row.o}>
                <Input
                  id={row.o}
                  inputMode="numeric"
                  disabled={locked}
                  value={form[row.o]}
                  onChange={(e) => set(row.o, e.target.value.replace(/[^0-9]/g, ""))}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Total Canada goals scored (3 games)"
          hint="Bonus — predict the tournament group-stage total."
          htmlFor="ts"
        >
          <Input
            id="ts"
            inputMode="numeric"
            disabled={locked}
            value={form.ts}
            onChange={(e) => set("ts", e.target.value.replace(/[^0-9]/g, ""))}
          />
        </Field>
        <Field label="Total Canada goals conceded (3 games)" htmlFor="tc">
          <Input
            id="tc"
            inputMode="numeric"
            disabled={locked}
            value={form.tc}
            onChange={(e) => set("tc", e.target.value.replace(/[^0-9]/g, ""))}
          />
        </Field>
      </div>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {!locked && (
        <Button onClick={submit} loading={saving}>
          Save Canada Pride Challenge
        </Button>
      )}
    </div>
  );
}
