import PublicPage from "@/components/seo/PublicPage";
import { pageMetadata } from "@/lib/seo/metadata";
import ComplaintContent from "@/components/legal/ComplaintContent";
export const metadata = pageMetadata("/complaints", "Complaint Handling Process | Keybase Financial Group", "How to raise a complaint with Keybase Financial Group and learn about the complaint handling process.");
export default function Page() { return <PublicPage title="Complaint Handling Process" path="/complaints"><ComplaintContent /></PublicPage>; }
