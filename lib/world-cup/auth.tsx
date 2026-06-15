"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "./supabaseBrowser";
import type { Profile } from "./types";

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async (user: User | undefined) => {
    if (!user) {
      setProfile(null);
      return;
    }
    const supabase = getSupabase();
    const { data } = await supabase
      .from("wc_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setProfile(data as Profile);
      return;
    }

    // No profile row yet (e.g. signed up with email confirmation enabled).
    // Create one from the metadata captured at registration.
    const meta = user.user_metadata ?? {};
    if (meta.full_name) {
      const { data: created } = await supabase
        .from("wc_profiles")
        .insert({
          id: user.id,
          full_name: meta.full_name,
          email: user.email ?? "",
          company: meta.company ?? null,
          favorite_team: meta.favorite_team ?? null,
          role: "participant",
        })
        .select("*")
        .maybeSingle();
      setProfile((created as Profile) ?? null);
      return;
    }
    setProfile(null);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!active) return;
      setSession(s);
      await loadProfile(s?.user);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(
    () => loadProfile(session?.user),
    [loadProfile, session]
  );

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        profile,
        isAdmin: profile?.role === "admin",
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
