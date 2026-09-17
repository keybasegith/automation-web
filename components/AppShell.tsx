import { redirect } from "next/navigation";

import AppShellClient from "@/components/AppShellClient";
import { getCurrentUser } from "@/lib/currentUser";

/**
 * The dashboard shell, resolved on the server.
 *
 * Nine layouts import this, so it is the one place every internal page passes
 * through. Reading the session here does two jobs: it hands the chrome a real
 * user to display without a client round-trip or a signed-out flash, and it is
 * the second check behind proxy.ts — a page cannot render its content to an
 * unauthenticated visitor even if the proxy matcher were wrong.
 *
 * Reading cookies makes every route under this shell dynamically rendered,
 * which is correct: these pages are per-user and must never be cached or
 * prerendered as static HTML.
 */
export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShellClient user={{ name: user.name, email: user.email }}>
      {children}
    </AppShellClient>
  );
}
