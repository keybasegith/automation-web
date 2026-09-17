"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Sign-in.
 *
 * The page holds no credential and makes no authorization decision: it posts
 * to /api/auth/login, and the server sets an httpOnly session cookie the
 * browser cannot read. Nothing is written to localStorage.
 *
 * The visual design is unchanged from the original screen.
 */

/** Shown for every failure. The server does not say which part was wrong. */
const GENERIC_FAILURE = "Incorrect email or password.";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Where to land after signing in. Only a path within this app is honoured —
   * an absolute URL in `next` would make this an open redirect.
   */
  const destination = (): string => {
    const requested = searchParams.get("next");
    if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
      return requested;
    }
    return "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        setError(GENERIC_FAILURE);
        setSubmitting(false);
        return;
      }

      // The session cookie is set; refresh so server components re-resolve it.
      router.replace(destination());
      router.refresh();
    } catch {
      // Never surface the underlying network or parsing error.
      setError("Could not sign in. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/keybase-logo%20copy.png"
            alt="Keybase Financial Group"
            width={200}
            height={200}
            priority
            className="mb-5 h-20 w-20 rounded-2xl object-contain"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Sign in to Keybase
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Welcome back. Please enter your details.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Protected workspace — authorized personnel only.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
