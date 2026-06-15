"use client";

import { useState } from "react";
import { Lock, Check } from "lucide-react";
import type { Match, Prediction } from "@/lib/world-cup/types";
import { formatMatchDate, isPast } from "@/lib/world-cup/format";
import { scoreMatchPrediction } from "@/lib/world-cup/scoring";
import { Badge, Button, Input, cx } from "./ui";

export function MatchPredictionCard({
  match,
  prediction,
  onSave,
}: {
  match: Match;
  prediction?: Prediction;
  onSave: (matchId: string, home: number, away: number) => Promise<void>;
}) {
  const locked = isPast(match.match_date) || match.status !== "scheduled";
  const completed = match.status === "completed" && match.home_score != null;

  const [home, setHome] = useState(prediction ? String(prediction.predicted_home_score) : "");
  const [away, setAway] = useState(prediction ? String(prediction.predicted_away_score) : "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    home !== (prediction ? String(prediction.predicted_home_score) : "") ||
    away !== (prediction ? String(prediction.predicted_away_score) : "");

  const points = prediction && completed ? scoreMatchPrediction(prediction, match) : null;

  async function save() {
    setError(null);
    const h = Number(home);
    const a = Number(away);
    if (home === "" || away === "" || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      setError("Enter a whole number of goals for each team.");
      return;
    }
    setSaving(true);
    try {
      await onSave(match.id, h, a);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save prediction.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cx(
        "rounded-2xl border bg-white p-4 shadow-sm sm:p-5",
        locked ? "border-gray-200" : "border-gray-200"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          {match.match_number != null && <span className="font-semibold">#{match.match_number}</span>}
          {match.stage && <Badge tone="navy">{match.stage}</Badge>}
          {match.group_name && <span>{match.group_name}</span>}
        </div>
        <span>{formatMatchDate(match.match_date)}</span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-right">
          <p className="font-bold text-[#0B1F3A]">{match.home_team}</p>
          {match.venue && <p className="truncate text-xs text-gray-400">{match.venue}</p>}
        </div>

        <div className="flex items-center gap-2">
          <Input
            aria-label={`${match.home_team} predicted goals`}
            inputMode="numeric"
            className="w-14 text-center"
            value={completed ? String(match.home_score) : home}
            onChange={(e) => setHome(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={locked}
            placeholder="–"
          />
          <span className="text-gray-400">:</span>
          <Input
            aria-label={`${match.away_team} predicted goals`}
            inputMode="numeric"
            className="w-14 text-center"
            value={completed ? String(match.away_score) : away}
            onChange={(e) => setAway(e.target.value.replace(/[^0-9]/g, ""))}
            disabled={locked}
            placeholder="–"
          />
        </div>

        <div className="text-left">
          <p className="font-bold text-[#0B1F3A]">{match.away_team}</p>
        </div>
      </div>

      {completed && (
        <p className="mt-3 text-center text-xs font-medium text-gray-500">
          Final: {match.home_team} {match.home_score}–{match.away_score} {match.away_team}
          {prediction && (
            <>
              {"  ·  Your pick: "}
              {prediction.predicted_home_score}–{prediction.predicted_away_score}
            </>
          )}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="text-xs">
          {locked ? (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <Lock className="h-3.5 w-3.5" /> {completed ? "Result final" : "Locked — match started"}
            </span>
          ) : prediction ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Prediction saved
            </span>
          ) : (
            <span className="text-gray-400">Not predicted yet</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {points != null && (
            <Badge tone={points > 0 ? "green" : "gray"}>
              {points} pt{points === 1 ? "" : "s"}
            </Badge>
          )}
          {!locked && (
            <Button size="sm" onClick={save} loading={saving} disabled={!dirty && !!prediction}>
              {saved ? "Saved!" : prediction ? "Update" : "Save"}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
