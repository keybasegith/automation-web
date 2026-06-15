"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CalendarDays,
  CheckCircle2,
  Clock,
  Crown,
  Megaphone,
} from "lucide-react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import type { LeaderboardRow } from "@/lib/world-cup/types";
import { AdminStatCard } from "@/components/world-cup/cards";
import { Maple } from "@/components/world-cup/icons";
import { Spinner, Alert, LinkButton } from "@/components/world-cup/ui";
import { BASE } from "@/lib/world-cup/config";

interface Stats {
  participants: number;
  matches: number;
  completed: number;
  upcoming: number;
  canada: number;
  finals: number;
  leader: LeaderboardRow | null;
}

async function count(table: string, build?: (q: any) => any): Promise<number> {
  const sb = getSupabase();
  let q = sb.from(table).select("*", { count: "exact", head: true });
  if (build) q = build(q);
  const { count } = await q;
  return count ?? 0;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        const nowIso = new Date().toISOString();
        const [participants, matches, completed, upcoming, canada, finals, leaderRes] =
          await Promise.all([
            count("wc_profiles", (q) => q.neq("role", "admin")),
            count("wc_matches"),
            count("wc_matches", (q) => q.eq("status", "completed")),
            count("wc_matches", (q) => q.eq("status", "scheduled").gt("match_date", nowIso)),
            count("wc_canada_challenges"),
            count("wc_final_predictions"),
            sb.from("wc_leaderboard").select("*").order("rank", { ascending: true }).limit(1).maybeSingle(),
          ]);
        setStats({
          participants,
          matches,
          completed,
          upcoming,
          canada,
          finals,
          leader: (leaderRes.data as LeaderboardRow) ?? null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load admin stats.");
      }
    })();
  }, []);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!stats)
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-6 w-6 text-[#C8102E]" />
      </div>
    );

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-[#0B1F3A]">Admin Overview</h1>
          <p className="mt-1 text-sm text-gray-500">Challenge health at a glance.</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`${BASE}/admin/results`} size="sm" variant="primary">
            Enter results
          </LinkButton>
          <LinkButton href={`${BASE}/admin/matches`} size="sm" variant="outline">
            Manage matches
          </LinkButton>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard label="Total participants" value={stats.participants} icon={Users} />
        <AdminStatCard label="Total matches" value={stats.matches} icon={CalendarDays} />
        <AdminStatCard label="Completed matches" value={stats.completed} icon={CheckCircle2} />
        <AdminStatCard label="Upcoming matches" value={stats.upcoming} icon={Clock} />
        <AdminStatCard
          label="Leaderboard leader"
          value={stats.leader ? <span className="text-xl">{stats.leader.full_name}</span> : "—"}
          hint={stats.leader ? `${stats.leader.total_points} pts` : "No points yet"}
          icon={Crown}
        />
        <AdminStatCard label="Canada Challenge submissions" value={stats.canada} icon={undefined} />
        <AdminStatCard label="Final prediction submissions" value={stats.finals} icon={Megaphone} />
      </div>

      <div className="mt-6 rounded-2xl border border-[#C8102E]/20 bg-[#C8102E]/5 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#0B1F3A]">
          <Maple className="h-4 w-4 text-[#C8102E]" /> Reminder
        </p>
        <p className="mt-1 text-sm text-gray-600">
          After entering or updating match results, go to{" "}
          <strong>Results → Recalculate points</strong> to refresh the leaderboard. The pool and
          prize structure remain subject to internal and legal approval — this platform does not
          process payments.
        </p>
      </div>
    </div>
  );
}
