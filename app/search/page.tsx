import PublicPage from "@/components/seo/PublicPage";
import { NOINDEX, pageMetadata } from "@/lib/seo/metadata";
import { getPublishedServicePages } from "@/lib/cms/public";
import { getPublishedArticles } from "@/lib/insights/registry";
import { getLeadershipProfiles } from "@/lib/people/leadership";
import { getAdvisorsWithProfiles } from "@/lib/people/advisors";
import { isProfileReady, profilePath } from "@/lib/people/people";
export const dynamic = "force-dynamic";
export const metadata = { ...pageMetadata("/search","Search | Keybase Financial Group","Search public services, articles, people and head-office information."), ...NOINDEX };
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}) {
 const raw=(await searchParams).q; const q=typeof raw === "string" ? raw.trim().slice(0,100) : "";
 const [services,articles,leaders]=await Promise.all([getPublishedServicePages(),getPublishedArticles(),getLeadershipProfiles()]);
 const people=[...getAdvisorsWithProfiles(),...leaders.filter(isProfileReady)];
 const entries=[...services.map(p=>({title:p.breadcrumbLabel,path:`/${p.slug}`,description:p.seoDescription})),...articles.map(a=>({title:a.title,path:`/newsroom/${a.slug}`,description:a.excerpt})),...people.map(p=>({title:p.name,path:profilePath(p.id),description:[p.role,p.shortBio,p.advisor?.city,p.advisor?.province,...(p.languages||[])].filter(Boolean).join(" ")})),{title:"Richmond Hill head office",path:"/locations/richmond-hill",description:"Keybase head office address and contact"},{title:"Compound interest calculator",path:"/tools/compound-interest-calculator",description:"Investment growth, savings and compounding"}];
 const terms=q.toLocaleLowerCase("en-CA").split(/\s+/).filter(Boolean);
 const matches=q ? [...new Map(entries.filter(e=>terms.every(t=>(e.title+" "+e.description).toLocaleLowerCase("en-CA").includes(t))).map(e=>[e.path,e])).values()].slice(0,50) : [];
 return <PublicPage title="Search Keybase" path="/search"><form method="get" action="/search" className="flex flex-wrap gap-3"><label htmlFor="q" className="w-full font-semibold">Search services, articles, people or locations</label><input id="q" name="q" defaultValue={q} maxLength={100} className="min-h-11 min-w-0 flex-1 border p-3" /><button className="min-h-11 bg-[#0a1f33] px-6 text-white">Search</button></form>{q && <p>{matches.length} results for “{q}”</p>}<ul className="space-y-6">{matches.map(e=><li key={e.path}><h2 className="text-xl font-semibold"><a className="underline" href={e.path}>{e.title}</a></h2><p>{e.description.slice(0,220)}</p></li>)}</ul>{q && matches.length===0 && <p>Try a service name, account type or advisor name. You can also <a className="underline" href="/contact">contact Keybase</a>.</p>}</PublicPage>;
}
