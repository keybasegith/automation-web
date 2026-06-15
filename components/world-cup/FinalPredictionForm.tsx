"use client";

import { useState } from "react";
import { Lock, Trophy } from "lucide-react";
import { TEAMS } from "@/lib/world-cup/config";
import type { FinalPrediction } from "@/lib/world-cup/types";
import { Alert, Badge, Button, Field, Select } from "./ui";

export type FinalPredictionPayload = {
  finalist_one: string;
  finalist_two: string;
  champion: string | null;
};

export function FinalPredictionForm({
  existing,
  locked,
  points,
  onSave,
}: {
  existing?: FinalPrediction | null;
  locked: boolean;
  points?: number;
  onSave: (payload: FinalPredictionPayload) => Promise<void>;
}) {
  const [one, setOne] = useState(existing?.finalist_one ?? "");
  const [two, setTwo] = useState(existing?.finalist_two ?? "");
  const [champion, setChampion] = useState(existing?.champion ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submit() {
    setMsg(null);
    if (!one || !two) {
      setMsg({ tone: "error", text: "Please pick both finalists." });
      return;
    }
    if (one === two) {
      setMsg({ tone: "error", text: "The two finalists must be different teams." });
      return;
    }
    if (champion && champion !== one && champion !== two) {
      setMsg({ tone: "error", text: "The champion must be one of your two finalists." });
      return;
    }
    setSaving(true);
    try {
      await onSave({ finalist_one: one, finalist_two: two, champion: champion || null });
      setMsg({ tone: "success", text: "Final prediction saved." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  const championOptions = [one, two].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-bold text-[#0B1F3A]">
          <Trophy className="h-5 w-5 text-[#C8102E]" /> Ultimate Final Prediction
        </h3>
        {points != null && <Badge tone="green">{points} pts earned</Badge>}
      </div>

      {locked && (
        <Alert tone="warning">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-4 w-4" /> Final predictions are locked.
          </span>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Finalist 1" required htmlFor="finalist-one">
          <Select id="finalist-one" value={one} disabled={locked} onChange={(e) => setOne(e.target.value)}>
            <option value="">Select team…</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Finalist 2" required htmlFor="finalist-two">
          <Select id="finalist-two" value={two} disabled={locked} onChange={(e) => setTwo(e.target.value)}>
            <option value="">Select team…</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Champion (optional)" hint="Must be one of your two finalists." htmlFor="champion">
        <Select
          id="champion"
          value={champion}
          disabled={locked || championOptions.length === 0}
          onChange={(e) => setChampion(e.target.value)}
        >
          <option value="">No champion pick</option>
          {championOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      {!locked && (
        <Button onClick={submit} loading={saving}>
          Save Final Prediction
        </Button>
      )}
    </div>
  );
}
