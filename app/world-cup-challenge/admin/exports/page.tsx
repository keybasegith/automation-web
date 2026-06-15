"use client";

import { useState } from "react";
import { Download, Trophy, Users } from "lucide-react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import type { LeaderboardRow, Profile } from "@/lib/world-cup/types";
import { toCsv, downloadCsv } from "@/lib/world-cup/csv";
import { formatDateOnly } from "@/lib/world-cup/format";
import { Alert, Button, Card } from "@/components/world-cup/ui";

export default function AdminExportsPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportLeaderboard() {
    setBusy("leaderboard");
    setError(null);
    try {
      const { data, error } = await getSupabase()
        .from("wc_leaderboard")
        .select("*")
        .order("rank", { ascending: true });
      if (error) throw error;
      const rows = (data as LeaderboardRow[]) ?? [];
      const csv = toCsv(
        ["Rank", "Participant", "Company", "Match points", "Canada points", "Final points", "Total points"],
        rows.map((r) => [r.rank, r.full_name, r.company ?? "", r.match_points, r.canada_points, r.final_points, r.total_points])
      );
      downloadCsv("leaderboard.csv", csv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  async function exportParticipants() {
    setBusy("participants");
    setError(null);
    try {
      const { data, error } = await getSupabase()
        .from("wc_profiles")
        .select("*")
        .neq("role", "admin")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data as Profile[]) ?? [];
      const csv = toCsv(
        ["Full name", "Email", "Company", "Favorite team", "Registered"],
        rows.map((p) => [p.full_name, p.email, p.company ?? "", p.favorite_team ?? "", formatDateOnly(p.created_at)])
      );
      downloadCsv("participants.csv", csv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-black text-[#0B1F3A]">Exports</h1>
        <p className="mt-1 text-sm text-gray-500">Download challenge data as CSV for offline use.</p>
      </header>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8102E]/10 text-[#C8102E]">
            <Trophy className="h-5 w-5" />
          </span>
          <h2 className="font-bold text-[#0B1F3A]">Leaderboard</h2>
          <p className="mt-1 text-sm text-gray-500">Ranked standings with the full point breakdown.</p>
          <Button className="mt-4" variant="outline" onClick={exportLeaderboard} loading={busy === "leaderboard"}>
            <Download className="h-4 w-4" /> Export leaderboard CSV
          </Button>
        </Card>

        <Card>
          <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1F3A]/10 text-[#0B1F3A]">
            <Users className="h-5 w-5" />
          </span>
          <h2 className="font-bold text-[#0B1F3A]">Participants</h2>
          <p className="mt-1 text-sm text-gray-500">The registered participant list with contact details.</p>
          <Button className="mt-4" variant="outline" onClick={exportParticipants} loading={busy === "participants"}>
            <Download className="h-4 w-4" /> Export participant CSV
          </Button>
        </Card>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Exports reflect current data. The pool, prize distribution, and payouts are managed offline
        by the organizers and remain subject to internal and legal approval.
      </p>
    </div>
  );
}
