import PublicPage from "@/components/seo/PublicPage";
import { pageMetadata } from "@/lib/seo/metadata";

const baseMetadata = pageMetadata("/contact/thank-you", "Thank you for your inquiry | Keybase Financial Group", "Your inquiry has been sent to Keybase Financial Group.");
export const metadata = { ...baseMetadata, robots: { index: false, follow: false } };
export default function Page() { return <PublicPage title="Thank you for your inquiry" path="/contact/thank-you"><p>Your inquiry has been sent to Keybase. For time-sensitive assistance, call <a className="underline" href="tel:+19057097911">905-709-7911</a>.</p><a className="underline" href="/our-advisors">Explore our advisors</a></PublicPage>; }
