import AppShell from "@/components/AppShell";

export default function FinancialStatementGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
