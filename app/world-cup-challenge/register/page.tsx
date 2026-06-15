"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BASE, EVENT, TEAMS } from "@/lib/world-cup/config";
import { getSupabase } from "@/lib/world-cup/supabaseBrowser";
import { useAuth } from "@/lib/world-cup/auth";
import { Alert, Button, Card, Field, Input, Select } from "@/components/world-cup/ui";

const CONSENT_TEXT =
  "I understand that this challenge is for internal engagement purposes. I agree to follow the official rules and understand that the pool and prize structure are subject to internal approval.";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError("Please enter your full name.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!consent) return setError("Please accept the consent statement to continue.");

    setSubmitting(true);
    try {
      const supabase = getSupabase();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company: company.trim() || null,
            favorite_team: favoriteTeam || null,
          },
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        // Email confirmation disabled — profile is created by the auth provider.
        await refreshProfile();
        router.replace(`${BASE}/predictions`);
      } else {
        // Email confirmation required — profile is created on first login.
        setConfirmEmail(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmEmail) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Card>
          <h1 className="text-xl font-bold text-[#0B1F3A]">Check your email</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            We sent a confirmation link to <strong>{email}</strong>. Confirm your
            address, then log in to start submitting predictions.
          </p>
          <Link href={`${BASE}/login`} className="mt-4 inline-block text-sm font-semibold text-[#C8102E] hover:underline">
            Go to login →
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl font-black text-[#0B1F3A]">Join the Challenge</h1>
        <p className="mt-2 text-sm text-gray-600">
          Register for the {EVENT.shortTitle}. Already have an account?{" "}
          <Link href={`${BASE}/login`} className="font-semibold text-[#C8102E] hover:underline">
            Log in
          </Link>
          .
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name" required htmlFor="full_name">
            <Input id="full_name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Email" required htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" required hint="At least 8 characters." htmlFor="password">
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Field label="Company or team name" htmlFor="company">
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field label="Favorite team" htmlFor="favorite_team">
            <Select id="favorite_team" value={favoriteTeam} onChange={(e) => setFavoriteTeam(e.target.value)}>
              <option value="">Select a team (optional)</option>
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <label className="flex items-start gap-2.5 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#C8102E]"
            />
            <span>{CONSENT_TEXT}</span>
          </label>

          {error && <Alert tone="error">{error}</Alert>}

          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Create my account
          </Button>
        </form>
      </Card>
    </div>
  );
}
