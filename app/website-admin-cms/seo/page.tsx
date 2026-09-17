import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, isValidSessionToken } from "@/lib/admin/auth";
import { isIndexableDeployment } from "@/lib/seo/deployment";
import { indexNowKey } from "@/lib/seo/indexnow";
import { getPublishedArticles } from "@/lib/insights/registry";
import SeoMetrics from "@/components/admin/SeoMetrics";
export const dynamic="force-dynamic";
export const metadata={title:"SEO / GEO operations | Keybase CMS",robots:{index:false,follow:false}};
export default async function SeoPage(){
 if(!isValidSessionToken((await cookies()).get(ADMIN_COOKIE_NAME)?.value))redirect("/website-admin-cms");
 const states:[string,boolean][]=[["Production indexing enabled",isIndexableDeployment()],["GA4 measurement ID configured",/^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID||"")],["Google verification token configured",Boolean(process.env.GOOGLE_SITE_VERIFICATION)],["Bing verification token configured",Boolean(process.env.BING_SITE_VERIFICATION)],["IndexNow key configured",Boolean(indexNowKey())],["Contact delivery configured",Boolean(process.env.CONTACT_INQUIRY_WEBHOOK_URL)],["Advisor application delivery configured",Boolean(process.env.ADVISOR_APPLICATION_WEBHOOK_URL || process.env.CONTACT_INQUIRY_WEBHOOK_URL)],["Careers delivery configured",Boolean(process.env.CAREERS_APPLICATION_WEBHOOK_URL)]];
 const articles=await getPublishedArticles();
 return <main className="max-w-7xl p-6 sm:p-10"><h1 className="text-3xl font-semibold">SEO / GEO operations</h1><p className="my-4">Configuration indicators confirm presence only. They do not verify external accounts, delivery, indexing or compliance approval.</p><ul className="grid gap-3 sm:grid-cols-2">{states.map(([label,ready])=><li className="rounded border bg-white p-4" key={label}>{label}: <strong>{ready?"Configured / enabled":"Not configured / disabled"}</strong></li>)}</ul><section className="mt-10"><h2 className="text-2xl font-semibold">Published content review queue</h2><p className="my-3">Source and reviewer fields are evidence to inspect, not an automatic quality score. Tax, rates and benefit figures need regular rechecking; review triggered changes before publication.</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Article","Published","Last reviewed","Sources","Reviewer recorded"].map(label=><th className="border p-3" key={label}>{label}</th>)}</tr></thead><tbody>{articles.map(a=><tr key={a.slug}><td className="border p-3"><a href={`/newsroom/${a.slug}`} className="underline">{a.title}</a></td><td className="border p-3">{a.publishedAt}</td><td className="border p-3">{a.reviewedAt||"Not recorded"}</td><td className="border p-3">{a.sources?.length||0}</td><td className="border p-3">{a.reviewerId?"Yes":"Not recorded"}</td></tr>)}</tbody></table></div></section><SeoMetrics /></main>;
}
