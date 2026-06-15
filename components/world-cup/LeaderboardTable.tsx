import { Maple } from "./icons";
import type { LeaderboardRow } from "@/lib/world-cup/types";
import { Badge, cx } from "./ui";

function rankBadge(rank: number) {
  if (rank === 1) return <Badge tone="gold">🥇 1st</Badge>;
  if (rank === 2) return <Badge tone="silver">🥈 2nd</Badge>;
  if (rank === 3) return <Badge tone="bronze">🥉 3rd</Badge>;
  if (rank === 4) return <Badge tone="navy">4th</Badge>;
  return <span className="font-semibold tabular-nums text-gray-500">{rank}</span>;
}

export function LeaderboardTable({
  rows,
  compact = false,
  highlightUserId,
}: {
  rows: LeaderboardRow[];
  compact?: boolean;
  highlightUserId?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-500">No participants on the leaderboard yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Points appear here once predictions are submitted and results are entered.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Participant</th>
            {!compact && <th className="px-4 py-3">Company</th>}
            {!compact && <th className="px-4 py-3 text-right">Match</th>}
            {!compact && <th className="px-4 py-3 text-right">Canada</th>}
            {!compact && <th className="px-4 py-3 text-right">Final</th>}
            <th className="px-4 py-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const me = highlightUserId && r.user_id === highlightUserId;
            const canadaContender = r.canada_points > 0;
            return (
              <tr
                key={r.user_id}
                className={cx(
                  r.rank <= 4 && "bg-amber-50/40",
                  me && "bg-[#C8102E]/5 ring-1 ring-inset ring-[#C8102E]/20"
                )}
              >
                <td className="whitespace-nowrap px-4 py-3">{rankBadge(r.rank)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0B1F3A]">{r.full_name}</span>
                    {me && <Badge tone="red">You</Badge>}
                    {canadaContender && (
                      <span title="Canada Pride contender" className="text-[#C8102E]">
                        <Maple className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  {compact && r.company && (
                    <p className="text-xs text-gray-400">{r.company}</p>
                  )}
                </td>
                {!compact && <td className="px-4 py-3 text-gray-500">{r.company ?? "—"}</td>}
                {!compact && <td className="px-4 py-3 text-right tabular-nums text-gray-500">{r.match_points}</td>}
                {!compact && <td className="px-4 py-3 text-right tabular-nums text-gray-500">{r.canada_points}</td>}
                {!compact && <td className="px-4 py-3 text-right tabular-nums text-gray-500">{r.final_points}</td>}
                <td className="px-4 py-3 text-right text-base font-black tabular-nums text-[#0B1F3A]">
                  {r.total_points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
