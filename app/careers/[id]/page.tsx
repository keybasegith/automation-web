import Link from "next/link";
import { notFound } from "next/navigation";
import { getVisiblePublishedRoles } from "@/lib/cms/public";
import { hasJobPage, jobPath } from "@/lib/seo/jobs";
import { pageMetadata } from "@/lib/seo/metadata";
import { PRODUCTION_ORIGIN } from "@/lib/seo/deployment";
import { buildJobPosting } from "@/lib/seo/schema/jobPosting";
import PublicPage from "@/components/seo/PublicPage";
import JsonLd from "@/lib/seo/jsonLd";
export const dynamic = "force-dynamic";
async function role(id:string) {return (await getVisiblePublishedRoles()).find(j=>j.id === id && hasJobPage(j));}
export async function generateMetadata({params}:{params:Promise<{id:string}>}) {
 const job = await role((await params).id); if(!job) notFound();
 return pageMetadata(jobPath(job),`${job.title} | Keybase Careers`,job.description.slice(0,160));
}
export default async function JobPage({params}:{params:Promise<{id:string}>}) {
 const job = await role((await params).id); if(!job) notFound();
 const employmentType:Record<string,string>={"full-time":"FULL_TIME","part-time":"PART_TIME","contract":"CONTRACTOR","temporary":"TEMPORARY","internship":"INTERN"};
 const schema=buildJobPosting({title:job.title,description:job.description,datePosted:job.datePosted,validThrough:`${job.validThrough}T23:59:59Z`,employmentType:employmentType[job.type.toLowerCase()],hiringOrganization:{name:"Keybase Financial Group Inc.",idFragment:"organization"},jobLocation:{addressLocality:job.addressLocality,addressRegion:job.addressRegion,addressCountry:"CA"},url:PRODUCTION_ORIGIN+jobPath(job)});
 return <PublicPage title={job.title} path={jobPath(job)}><JsonLd data={schema ? {"@context":"https://schema.org",...schema} : null} /><p>{job.department} · {job.location} · {job.type}</p><p>Posted: <time dateTime={job.datePosted}>{job.datePosted}</time> · Applications close: <time dateTime={job.validThrough}>{job.validThrough}</time> (UTC)</p><section><h2 className="text-2xl font-semibold">About this role</h2><p className="whitespace-pre-line">{job.description}</p></section><Link href="/careers#apply" className="inline-block bg-[#0a1f33] px-6 py-4 text-white">Apply for this role</Link><p>Select “{job.title}” in the application form.</p></PublicPage>;
}
