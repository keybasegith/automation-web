import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidSessionToken } from "@/lib/admin/auth";
import AdminShell from "@/components/admin/AdminShell";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminLogin from "@/components/admin/AdminLogin";

export const dynamic = "force-dynamic";

/**
 * /website-admin-cms — the single entry point of the website CMS. Shows the
 * sign-in form to visitors without a valid admin session, and the Overview
 * dashboard (inside the admin shell) once signed in. The layout renders this
 * route bare so the shell only appears after the auth check.
 */
export default async function WebsiteAdminHome() {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    return <AdminLogin />;
  }
  return (
    <AdminShell>
      <AdminOverview />
    </AdminShell>
  );
}
