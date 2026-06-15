"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { BASE } from "@/lib/world-cup/config";
import { useAuth } from "@/lib/world-cup/auth";
import { LinkButton, Spinner } from "./ui";

function FullScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {children}
    </div>
  );
}

/**
 * Wrap protected content. `requireAdmin` additionally enforces the admin role.
 * RLS is the real security boundary; this is the UX-level guard/redirect.
 */
export function Guard({
  requireAdmin = false,
  children,
}: {
  requireAdmin?: boolean;
  children: ReactNode;
}) {
  const { loading, session, profile, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      const next = requireAdmin ? `${BASE}/admin` : `${BASE}/predictions`;
      router.replace(`${BASE}/login?next=${encodeURIComponent(next)}`);
    }
  }, [loading, session, requireAdmin, router]);

  if (loading || (!session && typeof window !== "undefined")) {
    return (
      <FullScreen>
        <Spinner className="h-6 w-6 text-[#C8102E]" />
        <p className="mt-3 text-sm text-gray-500">Loading…</p>
      </FullScreen>
    );
  }

  if (requireAdmin && session && !isAdmin) {
    // Profile may still be loading on first paint.
    if (!profile) {
      return (
        <FullScreen>
          <Spinner className="h-6 w-6 text-[#C8102E]" />
        </FullScreen>
      );
    }
    return (
      <FullScreen>
        <ShieldAlert className="h-10 w-10 text-[#C8102E]" />
        <h1 className="mt-4 text-xl font-bold text-[#0B1F3A]">Admins only</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          This area is restricted to challenge organizers. If you believe this is
          an error, contact the event admin.
        </p>
        <LinkButton href={BASE} className="mt-5" variant="primary">
          Return home
        </LinkButton>
      </FullScreen>
    );
  }

  return <>{children}</>;
}
