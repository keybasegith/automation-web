"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Sign-in for the content system.
 *
 * On success we hard-reload rather than routing client-side, so the server
 * component at /content sees the new cookie and decides what to render — the
 * same pattern the website CMS login already uses.
 */
export default function ContentLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/content/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = "/content";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "That email and password do not match.");
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
            Keybase Content
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to write, review, and publish client-facing content.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label
            htmlFor="content-email"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="content-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#006d6e] focus:ring-2 focus:ring-[#006d6e]/15"
          />

          <label
            htmlFor="content-password"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="content-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-[#006d6e] focus:ring-2 focus:ring-[#006d6e]/15"
          />

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-[#006d6e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#005556] disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
