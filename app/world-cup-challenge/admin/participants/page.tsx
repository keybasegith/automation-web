"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Eye, X } from "lucide-react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import type { Profile, Prediction, Match, CanadaChallenge, FinalPrediction } from "@/lib/world-cup/types";
import { toCsv, downloadCsv } from "@/lib/world-cup/csv";
import { formatDateOnly } from "@/lib/world-cup/format";
import { Alert, Badge, Button, Card, Spinner } from "@/components/world-cup/ui";

interface DetailData {
  predictions: (Prediction & { match?: Match })[];
  canada: CanadaChallenge | null;
  final: FinalPrediction | null;
}

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSupabase()
      .from("wc_profiles")
      .select("*")
      .neq("role", "admin")
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    setParticipants((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function viewParticipant(p: Profile) {
    setSelected(p);
    setDetail(null);
    setDetailLoading(true);
    const sb = getSupabase();
    const [preds, matches, canada, final] = await Promise.all([
      sb.from("wc_predictions").select("*").eq("user_id", p.id),
      sb.from("wc_matches").select("*"),
      sb.from("wc_canada_challenges").select("*").eq("user_id", p.id).maybeSingle(),
      sb.from("wc_final_predictions").select("*").eq("user_id", p.id).maybeSingle(),
    ]);
    const matchMap = new Map((matches.data as Match[] ?? []).map((m) => [m.id, m]));
    const predictions = ((preds.data as Prediction[]) ?? []).map((pr) => ({
      ...pr,
      match: matchMap.get(pr.match_id),
    }));
    setDetail({
      predictions,
      canada: (canada.data as CanadaChallenge) ?? null,
      final: (final.data as FinalPrediction) ?? null,
    });
    setDetailLoading(false);
  }

  function exportCsv() {
    const csv = toCsv(
      ["Full name", "Email", "Company", "Favorite team", "Registered"],
      participants.map((p) => [p.full_name, p.email, p.company ?? "", p.favorite_team ?? "", formatDateOnly(p.created_at)])
    );
    downloadCsv("participants.csv", csv);
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black text-[#0B1F3A]">Participants</h1>
          <p className="mt-1 text-sm text-gray-500">{participants.length} registered participant(s).</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={participants.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </header>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-[#C8102E]" /></div>
      ) : participants.length === 0 ? (
        <Card className="text-center text-sm text-gray-500">No participants have registered yet.</Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="hidden px-4 py-3 sm:table-cell">Email</th>
                <th className="hidden px-4 py-3 md:table-cell">Company</th>
                <th className="hidden px-4 py-3 md:table-cell">Team</th>
                <th className="px-4 py-3 text-right">Predictions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {participants.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold text-[#0B1F3A]">{p.full_name}</td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{p.email}</td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{p.company ?? "—"}</td>
                  <td className="hidden px-4 py-3 text-gray-500 md:table-cell">{p.favorite_team ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => viewParticipant(p)}>
                      <Eye className="h-4 w-4" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#0B1F3A]">{selected.full_name}</h2>
                <p className="text-sm text-gray-500">{selected.email}{selected.company ? ` · ${selected.company}` : ""}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            {detailLoading || !detail ? (
              <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-[#C8102E]" /></div>
            ) : (
              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">Match predictions ({detail.predictions.length})</h3>
                  {detail.predictions.length === 0 ? (
                    <p className="text-sm text-gray-400">No match predictions submitted.</p>
                  ) : (
                    <ul className="space-y-1.5 text-sm">
                      {detail.predictions.map((pr) => (
                        <li key={pr.id} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-1.5">
                          <span className="text-gray-700">
                            {pr.match ? `${pr.match.home_team} vs ${pr.match.away_team}` : "Match"}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-[#0B1F3A]">{pr.predicted_home_score}–{pr.predicted_away_score}</span>
                            <Badge tone={pr.points_awarded > 0 ? "green" : "gray"}>{pr.points_awarded} pts</Badge>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">Canada Pride Challenge</h3>
                  {detail.canada ? (
                    <p className="text-sm text-gray-700">
                      Submitted · <Badge tone="green">{detail.canada.points_awarded} pts</Badge>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Not submitted.</p>
                  )}
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-400">Final prediction</h3>
                  {detail.final ? (
                    <p className="text-sm text-gray-700">
                      {detail.final.finalist_one} vs {detail.final.finalist_two}
                      {detail.final.champion ? ` · champion: ${detail.final.champion}` : ""}{" "}
                      <Badge tone="green">{detail.final.points_awarded} pts</Badge>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Not submitted.</p>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
