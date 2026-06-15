"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import { useAuth } from "@/lib/world-cup/auth";
import type { LeaderboardRow } from "@/lib/world-cup/types";
import { LeaderboardTable } from "@/components/world-cup/LeaderboardTable";
import { Alert, Badge, Button, Spinner } from "@/components/world-cup/ui";
import { Maple } from "@/components/world-cup/icons";

export default function LeaderboardPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await getSupabase()
        .from("wc_leaderboard")
        .select("*")
        .order("rank", { ascending: true });
      if (error) throw error;
      setRows((data as LeaderboardRow[]) ?? []);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the leaderboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-[#0B1F3A] sm:text-4xl">Leaderboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Top four participants are highlighted. The{" "}
            <span className="inline-flex items-center gap-1 text-[#C8102E]">
              <Maple className="h-3.5 w-3.5" />
            </span>{" "}
            marks Canada Pride contenders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-gray-400">
              Last updated {updatedAt.toLocaleTimeString("en-CA")}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="gold">🥇 1st</Badge>
        <Badge tone="silver">🥈 2nd</Badge>
        <Badge tone="bronze">🥉 3rd</Badge>
        <Badge tone="navy">4th</Badge>
        <Badge tone="red">
          <Maple className="h-3 w-3" /> Canada Pride contender
        </Badge>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-[#C8102E]" />
        </div>
      ) : (
        <LeaderboardTable rows={rows} highlightUserId={session?.user.id} />
      )}
    </div>
  );
}
