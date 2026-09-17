import Link from "next/link";
import { getPublishedArticles } from "@/lib/insights/registry";
import { canonicalPublicPath } from "@/lib/seo/public-paths";
export default async function ServiceResources({slug}:{slug:string}) {
 const articles=(await getPublishedArticles()).filter(article=>article.relatedServices?.some(s=>canonicalPublicPath(s.href)===`/${slug}`)).slice(0,3);
 return <section className="border-t border-black/10 bg-white"><div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8"><h2 className="font-serif text-3xl">Planning resources</h2><ul className="mt-5 space-y-3">{articles.map(a=><li key={a.slug}><Link className="underline" href={`/newsroom/${a.slug}`}>{a.title}</Link></li>)}<li><Link className="underline" href="/tools/compound-interest-calculator">Explore investment growth with the compound interest calculator</Link></li><li><Link className="underline" href="/newsroom">Read Keybase insights and financial education</Link></li><li><Link className="underline" href="/our-advisors">Find an advisor to discuss your plan</Link></li></ul></div></section>;
}
