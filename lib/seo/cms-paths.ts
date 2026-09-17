import { SERVICE_SLUGS } from "./public-paths";
export function cmsPaths(resource: string, ...snapshots: unknown[]): string[] {
 const paths=new Set<string>(["/"]);
 if(resource==="service-pages") for(const slug of SERVICE_SLUGS) paths.add(`/${slug}`);
 if(resource==="careers") paths.add("/careers");
 if(resource==="executives") paths.add("/key-executives");
 if(resource==="newsroom") paths.add("/newsroom");
 for(const snapshot of snapshots) {
  if(!snapshot || typeof snapshot!=="object") continue;
  const doc=snapshot as Record<string,unknown>;
  if(resource==="executives" && Array.isArray(doc.people)) for(const person of doc.people) {
    if(typeof person?.name === "string") paths.add(`/people/${person.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`);
  }
  if(resource==="careers" && Array.isArray(doc.roles)) for(const job of doc.roles) if(typeof job?.id === "string" && job.datePosted) paths.add(`/careers/${job.id}`);
  if(Array.isArray(doc.pages)) for(const page of doc.pages) if(typeof page?.slug === "string") paths.add(`/${page.slug}`);
 }
 return [...paths];
}
