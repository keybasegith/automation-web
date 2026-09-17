import AppShell from "@/components/AppShell";

export default function InternalAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
