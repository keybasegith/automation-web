"use client";

import { useEffect, useState, useCallback } from "react";
import { Calculator, Save } from "lucide-react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import type { Match, EventSettings } from "@/lib/world-cup/types";
import { formatMatchDate } from "@/lib/world-cup/format";
import { TEAMS } from "@/lib/world-cup/config";
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner } from "@/components/world-cup/ui";

function ResultRow({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? "");
  const [away, setAway] = useState(match.away_score?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(markCompleted: boolean) {
    setError(null);
    if (markCompleted && (home === "" || away === "")) {
      setError("Enter both scores.");
      return;
    }
    setSaving(true);
    const h = home === "" ? null : Number(home);
    const a = away === "" ? null : Number(away);
    const winner =
      h == null || a == null ? null : h > a ? match.home_team : h < a ? match.away_team : "Draw";
    const { error } = await getSupabase()
      .from("wc_matches")
      .update({
        home_score: h,
        away_score: a,
        winner,
        status: markCompleted ? "completed" : match.status,
      })
      .eq("id", match.id);
    setSaving(false);
    if (error) setError(error.message);
    else onSaved();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[#0B1F3A]">
          {match.home_team} vs {match.away_team}
        </p>
        <p className="text-xs text-gray-400">{formatMatchDate(match.match_date)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <Input aria-label="home score" inputMode="numeric" className="w-14 text-center" value={home} onChange={(e) => setHome(e.target.value.replace(/[^0-9]/g, ""))} />
        <span className="text-gray-400">:</span>
        <Input aria-label="away score" inputMode="numeric" className="w-14 text-center" value={away} onChange={(e) => setAway(e.target.value.replace(/[^0-9]/g, ""))} />
      </div>
      <Badge tone={match.status === "completed" ? "green" : match.status === "live" ? "red" : "gray"}>
        {match.status}
      </Badge>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={() => save(false)} loading={saving}>Save</Button>
        <Button size="sm" onClick={() => save(true)} loading={saving}>Mark final</Button>
      </div>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function AdminResultsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalcing, setRecalcing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sb = getSupabase();
    const [m, s] = await Promise.all([
      sb.from("wc_matches").select("*").order("match_date", { ascending: true }),
      sb.from("wc_event_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    setMatches((m.data as Match[]) ?? []);
    setSettings((s.data as EventSettings) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function recalculate() {
    setMsg(null);
    setRecalcing(true);
    const { error } = await getSupabase().rpc("wc_recalculate_points");
    setRecalcing(false);
    setMsg(
      error
        ? { tone: "error", text: error.message }
        : { tone: "success", text: "Points recalculated. The leaderboard is up to date." }
    );
  }

  function setS<K extends keyof EventSettings>(key: K, value: EventSettings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function saveSettings() {
    if (!settings) return;
    setMsg(null);
    setSavingSettings(true);
    const { error } = await getSupabase()
      .from("wc_event_settings")
      .update({
        canada_match_1_id: settings.canada_match_1_id,
        canada_match_2_id: settings.canada_match_2_id,
        canada_match_3_id: settings.canada_match_3_id,
        canada_lock_date: settings.canada_lock_date,
        final_lock_date: settings.final_lock_date,
        actual_finalist_one: settings.actual_finalist_one,
        actual_finalist_two: settings.actual_finalist_two,
        actual_champion: settings.actual_champion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSavingSettings(false);
    setMsg(
      error
        ? { tone: "error", text: error.message }
        : { tone: "success", text: "Settings saved. Recalculate points to apply to scoring." }
    );
  }

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-[#C8102E]" />
      </div>
    );

  const matchOptions = matches.map((m) => (
    <option key={m.id} value={m.id}>
      {m.home_team} vs {m.away_team}
    </option>
  ));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-[#0B1F3A]">Results &amp; Scoring</h1>
          <p className="mt-1 text-sm text-gray-500">Enter official scores, then recalculate points.</p>
        </div>
        <Button onClick={recalculate} loading={recalcing}>
          <Calculator className="h-4 w-4" /> Recalculate points
        </Button>
      </header>

      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <Card>
        <h2 className="mb-2 font-bold text-[#0B1F3A]">Match results</h2>
        {matches.length === 0 ? (
          <p className="py-4 text-sm text-gray-500">No matches to score yet.</p>
        ) : (
          matches.map((m) => <ResultRow key={m.id} match={m} onSaved={load} />)
        )}
      </Card>

      {settings && (
        <Card>
          <h2 className="mb-1 font-bold text-[#0B1F3A]">Official results &amp; lock dates</h2>
          <p className="mb-4 text-sm text-gray-500">
            Map Canada’s three group games and record the final result so the Canada Pride and
            Final Prediction challenges can be scored.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Canada game 1" htmlFor="cg1">
              <Select id="cg1" value={settings.canada_match_1_id ?? ""} onChange={(e) => setS("canada_match_1_id", e.target.value || null)}>
                <option value="">—</option>
                {matchOptions}
              </Select>
            </Field>
            <Field label="Canada game 2" htmlFor="cg2">
              <Select id="cg2" value={settings.canada_match_2_id ?? ""} onChange={(e) => setS("canada_match_2_id", e.target.value || null)}>
                <option value="">—</option>
                {matchOptions}
              </Select>
            </Field>
            <Field label="Canada game 3" htmlFor="cg3">
              <Select id="cg3" value={settings.canada_match_3_id ?? ""} onChange={(e) => setS("canada_match_3_id", e.target.value || null)}>
                <option value="">—</option>
                {matchOptions}
              </Select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Canada Challenge lock date" htmlFor="clock">
              <Input
                id="clock"
                type="datetime-local"
                value={settings.canada_lock_date ? settings.canada_lock_date.slice(0, 16) : ""}
                onChange={(e) => setS("canada_lock_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </Field>
            <Field label="Final Prediction lock date" htmlFor="flock">
              <Input
                id="flock"
                type="datetime-local"
                value={settings.final_lock_date ? settings.final_lock_date.slice(0, 16) : ""}
                onChange={(e) => setS("final_lock_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Actual finalist 1" htmlFor="af1">
              <Select id="af1" value={settings.actual_finalist_one ?? ""} onChange={(e) => setS("actual_finalist_one", e.target.value || null)}>
                <option value="">—</option>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Actual finalist 2" htmlFor="af2">
              <Select id="af2" value={settings.actual_finalist_two ?? ""} onChange={(e) => setS("actual_finalist_two", e.target.value || null)}>
                <option value="">—</option>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Champion" htmlFor="champ">
              <Select id="champ" value={settings.actual_champion ?? ""} onChange={(e) => setS("actual_champion", e.target.value || null)}>
                <option value="">—</option>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>

          <Button className="mt-5" variant="secondary" onClick={saveSettings} loading={savingSettings}>
            <Save className="h-4 w-4" /> Save settings
          </Button>
        </Card>
      )}
    </div>
  );
}
