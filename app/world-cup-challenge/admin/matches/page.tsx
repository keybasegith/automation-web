"use client";

import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import type { Match } from "@/lib/world-cup/types";
import { formatMatchDate } from "@/lib/world-cup/format";
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner } from "@/components/world-cup/ui";

type FormState = {
  id?: string;
  match_number: string;
  stage: string;
  group_name: string;
  home_team: string;
  away_team: string;
  match_date: string; // datetime-local value
  venue: string;
  status: string;
};

const EMPTY: FormState = {
  match_number: "",
  stage: "Group Stage",
  group_name: "",
  home_team: "",
  away_team: "",
  match_date: "",
  venue: "",
  status: "scheduled",
};

// Convert an ISO timestamp to a value usable by <input type="datetime-local">.
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSupabase()
      .from("wc_matches")
      .select("*")
      .order("match_date", { ascending: true });
    if (error) setError(error.message);
    setMatches((data as Match[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setError(null);
    setForm({ ...EMPTY });
  }

  function startEdit(m: Match) {
    setError(null);
    setForm({
      id: m.id,
      match_number: m.match_number?.toString() ?? "",
      stage: m.stage ?? "",
      group_name: m.group_name ?? "",
      home_team: m.home_team,
      away_team: m.away_team,
      match_date: isoToLocalInput(m.match_date),
      venue: m.venue ?? "",
      status: m.status,
    });
  }

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function save() {
    if (!form) return;
    setError(null);
    if (!form.home_team || !form.away_team || !form.match_date) {
      setError("Home team, away team, and match date are required.");
      return;
    }
    setSaving(true);
    const payload = {
      match_number: form.match_number ? Number(form.match_number) : null,
      stage: form.stage || null,
      group_name: form.group_name || null,
      home_team: form.home_team.trim(),
      away_team: form.away_team.trim(),
      match_date: new Date(form.match_date).toISOString(),
      venue: form.venue || null,
      status: form.status,
    };
    const sb = getSupabase();
    const res = form.id
      ? await sb.from("wc_matches").update(payload).eq("id", form.id)
      : await sb.from("wc_matches").insert(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setForm(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this match? Predictions for it will also be removed.")) return;
    const { error } = await getSupabase().from("wc_matches").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-[#0B1F3A]">Matches</h1>
          <p className="mt-1 text-sm text-gray-500">Add, edit, and remove tournament fixtures.</p>
        </div>
        {!form && (
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4" /> Add match
          </Button>
        )}
      </header>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {form && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-[#0B1F3A]">{form.id ? "Edit match" : "New match"}</h2>
            <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Home team" required htmlFor="home_team">
              <Input id="home_team" value={form.home_team} onChange={(e) => set("home_team", e.target.value)} />
            </Field>
            <Field label="Away team" required htmlFor="away_team">
              <Input id="away_team" value={form.away_team} onChange={(e) => set("away_team", e.target.value)} />
            </Field>
            <Field label="Match date & time" required htmlFor="match_date">
              <Input id="match_date" type="datetime-local" value={form.match_date} onChange={(e) => set("match_date", e.target.value)} />
            </Field>
            <Field label="Venue" htmlFor="venue">
              <Input id="venue" value={form.venue} onChange={(e) => set("venue", e.target.value)} />
            </Field>
            <Field label="Match number" htmlFor="match_number">
              <Input id="match_number" inputMode="numeric" value={form.match_number} onChange={(e) => set("match_number", e.target.value.replace(/[^0-9]/g, ""))} />
            </Field>
            <Field label="Stage" htmlFor="stage">
              <Input id="stage" value={form.stage} onChange={(e) => set("stage", e.target.value)} placeholder="Group Stage / Round of 32 / Final" />
            </Field>
            <Field label="Group" htmlFor="group_name">
              <Input id="group_name" value={form.group_name} onChange={(e) => set("group_name", e.target.value)} placeholder="Group B" />
            </Field>
            <Field label="Status" htmlFor="status">
              <Select id="status" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={save} loading={saving}>{form.id ? "Save changes" : "Create match"}</Button>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-[#C8102E]" /></div>
      ) : matches.length === 0 ? (
        <Card className="text-center text-sm text-gray-500">No matches yet. Add your first fixture above.</Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Match</th>
                <th className="hidden px-4 py-3 sm:table-cell">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matches.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 tabular-nums text-gray-400">{m.match_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#0B1F3A]">{m.home_team} vs {m.away_team}</p>
                    <p className="text-xs text-gray-400">{[m.stage, m.group_name].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{formatMatchDate(m.match_date)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={m.status === "completed" ? "green" : m.status === "live" ? "red" : "gray"}>
                      {m.status === "completed" && m.home_score != null
                        ? `${m.home_score}–${m.away_score}`
                        : m.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEdit(m)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(m.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
