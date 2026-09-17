import PublicPage from "@/components/seo/PublicPage";
import { pageMetadata } from "@/lib/seo/metadata";
import PrivacyPolicyContent from "@/components/legal/PrivacyPolicyContent";
export const metadata = pageMetadata("/privacy", "Privacy Policy | Keybase Financial Group", "How Keybase Financial Group collects, uses and protects personal information.");
export default function Page() { return <PublicPage title="Privacy Policy" path="/privacy"><PrivacyPolicyContent /></PublicPage>; }
