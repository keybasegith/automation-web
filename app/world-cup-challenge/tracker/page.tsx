"use client";

import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import type {
  Match,
  Announcement,
  LeaderboardRow,
  EventSettings,
} from "@/lib/world-cup/types";
import { formatMatchDate, isToday } from "@/lib/world-cup/format";
import { LeaderboardTable } from "@/components/world-cup/LeaderboardTable";
import { DailyTrackerCard, AnnouncementCard } from "@/components/world-cup/cards";
import { Badge, Spinner, Alert } from "@/components/world-cup/ui";
import { Maple } from "@/components/world-cup/icons";

function statusBadge(m: Match) {
  if (m.status === "completed")
    return <Badge tone="green">{m.home_score}–{m.away_score} FT</Badge>;
  if (m.status === "live") return <Badge tone="red">LIVE</Badge>;
  return <Badge tone="gray">{formatMatchDate(m.match_date)}</Badge>;
}

function MatchLine({ m }: { m: Match }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2.5 text-sm last:border-0">
      <span className="font-medium text-[#0B1F3A]">
        {m.home_team} <span className="text-gray-400">vs</span> {m.away_team}
      </span>
      {statusBadge(m)}
    </div>
  );
}

export default function TrackerPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardRow[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      const [m, a, l, s] = await Promise.all([
        sb.from("wc_matches").select("*").order("match_date", { ascending: true }),
        sb.from("wc_announcements").select("*").eq("published", true).order("created_at", { ascending: false }).limit(4),
        sb.from("wc_leaderboard").select("*").order("rank", { ascending: true }).limit(10),
        sb.from("wc_event_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      if (m.error) throw m.error;
      setMatches((m.data as Match[]) ?? []);
      setAnnouncements((a.data as Announcement[]) ?? []);
      setLeaders((l.data as LeaderboardRow[]) ?? []);
      setSettings((s.data as EventSettings) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tracker data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const todays = matches.filter((m) => isToday(m.match_date));
  const recent = matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => +new Date(b.match_date) - +new Date(a.match_date))
    .slice(0, 6);

  const canadaIds = settings
    ? [settings.canada_match_1_id, settings.canada_match_2_id, settings.canada_match_3_id]
    : [];
  const canadaGames = canadaIds
    .map((id) => matches.find((m) => m.id === id))
    .filter((m): m is Match => Boolean(m));

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-[#C8102E]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-[#0B1F3A] sm:text-4xl">Daily Tracker</h1>
        <p className="mt-2 text-gray-600">Today’s matches, recent results, standings, and the latest updates.</p>
      </header>

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DailyTrackerCard title="Today’s matches">
            {todays.length ? (
              todays.map((m) => <MatchLine key={m.id} m={m} />)
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">No matches scheduled for today.</p>
            )}
          </DailyTrackerCard>

          <DailyTrackerCard title="Recent results">
            {recent.length ? (
              recent.map((m) => <MatchLine key={m.id} m={m} />)
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">No completed matches yet.</p>
            )}
          </DailyTrackerCard>

          <DailyTrackerCard title="Top 10 leaderboard" action={{ label: "Full leaderboard", href: "/world-cup-challenge/leaderboard" }}>
            <LeaderboardTable rows={leaders} compact />
          </DailyTrackerCard>
        </div>

        <div className="space-y-6">
          <DailyTrackerCard title="Canada Pride status">
            {canadaGames.length ? (
              <div className="space-y-1">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[#C8102E]">
                  <Maple className="h-4 w-4" /> Team Canada — group stage
                </p>
                {canadaGames.map((m) => (
                  <MatchLine key={m.id} m={m} />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-gray-400">Canada games not configured yet.</p>
            )}
          </DailyTrackerCard>

          <div>
            <h2 className="mb-3 text-lg font-bold text-[#0B1F3A]">Latest announcements</h2>
            <div className="space-y-4">
              {announcements.length ? (
                announcements.map((a) => <AnnouncementCard key={a.id} announcement={a} />)
              ) : (
                <p className="text-sm text-gray-400">No announcements published yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
