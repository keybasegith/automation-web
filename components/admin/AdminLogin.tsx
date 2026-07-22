"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Sign-in form shown at /website-admin-cms when there is no valid admin
 * session. The server component at that route decides whether to render this
 * or the dashboard, so on success we hard-reload the same URL and let the
 * server see the new cookie.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/website-admin-cms/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = "/website-admin-cms";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "Incorrect password.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
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
            Website Admin
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage the public website content.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@keybase.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#006d6e] focus:outline-none focus:ring-2 focus:ring-[#006d6e]/15"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#006d6e] focus:outline-none focus:ring-2 focus:ring-[#006d6e]/15"
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
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-[#006d6e] px-4 text-sm font-medium text-white transition hover:bg-[#00585a] focus:outline-none focus:ring-2 focus:ring-[#006d6e]/30 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Website content management — authorized staff only.
        </p>
      </div>
    </div>
  );
}
