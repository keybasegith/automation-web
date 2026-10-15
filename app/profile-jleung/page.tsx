import type { Metadata } from "next";
import AdvisorPageTemplate from "@/components/advisor-portal/AdvisorPageTemplate";
import { DEFAULT_ADVISOR_PROFILE as profile } from "@/lib/advisor-portal/template";
const fullName = `${profile.firstName} ${profile.lastName}`;
export const metadata: Metadata = {
  title: `${fullName} — ${profile.title}, ${profile.company}`,
  description: `${fullName}, ${profile.title} at ${profile.company}. ${profile.tagline}.`,
};

export default function ProfileJleungPage() {
  return <AdvisorPageTemplate profile={profile} />;
}
