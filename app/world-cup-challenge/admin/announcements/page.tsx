"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Eye, EyeOff, X } from "lucide-react";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import type { Announcement } from "@/lib/world-cup/types";
import { formatDateOnly } from "@/lib/world-cup/format";
import { Alert, Badge, Button, Card, Field, Input, Select, Textarea, Spinner } from "@/components/world-cup/ui";

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("daily");
  const [publishNow, setPublishNow] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSupabase()
      .from("wc_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    setItems((data as Announcement[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setSaving(true);
    const { error } = await getSupabase().from("wc_announcements").insert({
      title: title.trim(),
      body: body.trim(),
      type,
      published: publishNow,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTitle("");
    setBody("");
    setType("daily");
    setPublishNow(true);
    setCreating(false);
    load();
  }

  async function togglePublish(a: Announcement) {
    const { error } = await getSupabase().from("wc_announcements").update({ published: !a.published }).eq("id", a.id);
    if (error) setError(error.message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await getSupabase().from("wc_announcements").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-[#0B1F3A]">Announcements</h1>
          <p className="mt-1 text-sm text-gray-500">Publish daily updates and weekly recaps.</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New
          </Button>
        )}
      </header>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {creating && (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-[#0B1F3A]">New announcement</h2>
            <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            <Field label="Title" required htmlFor="title">
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Body" required htmlFor="body">
              <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="type">
                <Select id="type" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="daily">Daily update</option>
                  <option value="weekly">Weekly recap</option>
                  <option value="general">General</option>
                </Select>
              </Field>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-gray-700">
                <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="h-4 w-4 accent-[#C8102E]" />
                Publish immediately
              </label>
            </div>
            <Button onClick={create} loading={saving}>Create announcement</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-[#C8102E]" /></div>
      ) : items.length === 0 ? (
        <Card className="text-center text-sm text-gray-500">No announcements yet.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={a.type === "weekly" ? "navy" : a.type === "daily" ? "red" : "gray"}>{a.type}</Badge>
                    {a.published ? <Badge tone="green">Published</Badge> : <Badge tone="gray">Draft</Badge>}
                    <span className="text-xs text-gray-400">{formatDateOnly(a.created_at)}</span>
                  </div>
                  <h3 className="mt-2 font-bold text-[#0B1F3A]">{a.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{a.body}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => togglePublish(a)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label={a.published ? "Unpublish" : "Publish"}>
                    {a.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => remove(a.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
