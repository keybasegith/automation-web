import AppShellClient from "@/components/AppShellClient";
import { getCurrentUser } from "@/lib/currentUser";

/** Public automation workspace shell. */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <AppShellClient user={{ name: user.name, email: user.email }}>
      {children}
    </AppShellClient>
  );
}
