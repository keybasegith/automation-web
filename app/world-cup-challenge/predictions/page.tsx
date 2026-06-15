"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { CalendarDays } from "lucide-react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import { useAuth } from "@/lib/world-cup/auth";
import type {
  Match,
  Prediction,
  CanadaChallenge,
  FinalPrediction,
  EventSettings,
} from "@/lib/world-cup/types";
import { isPast } from "@/lib/world-cup/format";
import { Guard } from "@/components/world-cup/Guard";
import { MatchPredictionCard } from "@/components/world-cup/MatchPredictionCard";
import {
  CanadaChallengeForm,
  type CanadaChallengePayload,
  type CanadaGameMeta,
} from "@/components/world-cup/CanadaChallengeForm";
import {
  FinalPredictionForm,
  type FinalPredictionPayload,
} from "@/components/world-cup/FinalPredictionForm";
import { Alert, Card, Spinner, cx } from "@/components/world-cup/ui";

type Tab = "matches" | "canada" | "final";

function PredictionsInner() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;

  const [tab, setTab] = useState<Tab>("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [canada, setCanada] = useState<CanadaChallenge | null>(null);
  const [finalPred, setFinalPred] = useState<FinalPrediction | null>(null);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const [m, p, c, f, s] = await Promise.all([
        sb.from("wc_matches").select("*").order("match_date", { ascending: true }),
        sb.from("wc_predictions").select("*").eq("user_id", userId),
        sb.from("wc_canada_challenges").select("*").eq("user_id", userId).maybeSingle(),
        sb.from("wc_final_predictions").select("*").eq("user_id", userId).maybeSingle(),
        sb.from("wc_event_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (m.error) throw m.error;
      if (p.error) throw p.error;
      setMatches((m.data as Match[]) ?? []);
      const map: Record<string, Prediction> = {};
      for (const pr of (p.data as Prediction[]) ?? []) map[pr.match_id] = pr;
      setPredictions(map);
      setCanada((c.data as CanadaChallenge) ?? null);
      setFinalPred((f.data as FinalPrediction) ?? null);
      setSettings((s.data as EventSettings) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your predictions.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const savePrediction = useCallback(
    async (matchId: string, home: number, away: number) => {
      if (!userId) throw new Error("Not signed in.");
      const match = matches.find((m) => m.id === matchId);
      const winner = !match
        ? null
        : home > away
        ? match.home_team
        : home < away
        ? match.away_team
        : "Draw";
      const sb = getSupabase();
      const { data, error } = await sb
        .from("wc_predictions")
        .upsert(
          {
            user_id: userId,
            match_id: matchId,
            predicted_home_score: home,
            predicted_away_score: away,
            predicted_winner: winner,
          },
          { onConflict: "user_id,match_id" }
        )
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      setPredictions((prev) => ({ ...prev, [matchId]: data as Prediction }));
    },
    [userId, matches]
  );

  const saveCanada = useCallback(
    async (payload: CanadaChallengePayload) => {
      if (!userId) throw new Error("Not signed in.");
      const sb = getSupabase();
      const { data, error } = await sb
        .from("wc_canada_challenges")
        .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      setCanada(data as CanadaChallenge);
    },
    [userId]
  );

  const saveFinal = useCallback(
    async (payload: FinalPredictionPayload) => {
      if (!userId) throw new Error("Not signed in.");
      const sb = getSupabase();
      const { data, error } = await sb
        .from("wc_final_predictions")
        .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      setFinalPred(data as FinalPrediction);
    },
    [userId]
  );

  const canadaGames: CanadaGameMeta[] = useMemo(() => {
    if (!settings) return [];
    const ids = [settings.canada_match_1_id, settings.canada_match_2_id, settings.canada_match_3_id];
    return ids.map((id) => {
      const m = matches.find((x) => x.id === id);
      if (!m) return { opponent: "TBD" };
      const opponent = m.home_team === "Canada" ? m.away_team : m.home_team;
      return { opponent, date: m.match_date };
    });
  }, [settings, matches]);

  const canadaLocked = isPast(settings?.canada_lock_date);
  const finalLocked = isPast(settings?.final_lock_date);

  const savedCount = Object.keys(predictions).length;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-[#C8102E]" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "matches", label: `Matches (${savedCount}/${matches.length})` },
    { id: "canada", label: "Canada Pride" },
    { id: "final", label: "Final Prediction" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-black text-[#0B1F3A] sm:text-4xl">My Predictions</h1>
        <p className="mt-2 text-sm text-gray-600">
          {profile ? `Welcome, ${profile.full_name}. ` : ""}
          Submit and update your predictions before each lock. Points appear once results are entered.
        </p>
      </header>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "bg-white text-[#C8102E] shadow-sm" : "text-gray-500 hover:text-[#0B1F3A]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "matches" && (
        <div className="space-y-4">
          {matches.length === 0 ? (
            <Card className="text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No matches have been scheduled yet. Check back soon.</p>
            </Card>
          ) : (
            matches.map((m) => (
              <MatchPredictionCard
                key={m.id}
                match={m}
                prediction={predictions[m.id]}
                onSave={savePrediction}
              />
            ))
          )}
        </div>
      )}

      {tab === "canada" && (
        <Card>
          <CanadaChallengeForm
            games={canadaGames}
            existing={canada}
            locked={canadaLocked}
            points={canada?.points_awarded}
            onSave={saveCanada}
          />
        </Card>
      )}

      {tab === "final" && (
        <Card>
          <FinalPredictionForm
            existing={finalPred}
            locked={finalLocked}
            points={finalPred?.points_awarded}
            onSave={saveFinal}
          />
        </Card>
      )}
    </div>
  );
}

export default function PredictionsPage() {
  return (
    <Guard>
      <PredictionsInner />
    </Guard>
  );
}
