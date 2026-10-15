import type { Metadata } from "next";
import AdvisorPortal from "@/components/advisor-portal/AdvisorPortal";
export const metadata: Metadata = {
  title: "Advisor Portal | Keybase Automation",
  robots: { index: false, follow: false },
};
export default async function AdvisorPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const allowDemo = process.env.NODE_ENV === "development";
  return (
    <>
      <AdvisorPortal
        demo={allowDemo && params.demo === "1"}
        allowDemo={allowDemo}
      />
    </>
  );
}
