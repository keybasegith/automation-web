"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Singleton browser client (anon key). Row Level Security is the real security
// boundary for this feature — the anon key is safe to ship to the browser.
// A singleton is required so the auth session persists and onAuthStateChange
// fires consistently across the app.

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "wc-challenge-auth",
    },
  });
  return client;
}
