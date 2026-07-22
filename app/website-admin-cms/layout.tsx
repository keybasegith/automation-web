"use client";

import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The root route decides between the sign-in form and the dashboard itself,
  // so it renders bare — no sidebar, no client-side auth guard.
  if (pathname === "/website-admin-cms") {
    return <>{children}</>;
  }

  return <AdminShell>{children}</AdminShell>;
}
