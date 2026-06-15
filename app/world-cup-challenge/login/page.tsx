"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BASE, EVENT } from "@/lib/world-cup/config";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import { useAuth } from "@/lib/world-cup/auth";
import { Alert, Button, Card, Field, Input } from "@/components/world-cup/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || `${BASE}/predictions`;
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      await refreshProfile();
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-black text-[#0B1F3A]">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-600">
          Log in to the {EVENT.shortTitle}. New here?{" "}
          <Link href={`${BASE}/register`} className="font-semibold text-[#C8102E] hover:underline">
            Join the challenge
          </Link>
          .
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" required htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" required htmlFor="password">
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>

          {error && <Alert tone="error">{error}</Alert>}

          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Log in
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
