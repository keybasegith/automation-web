import { isIndexableDeployment, PRODUCTION_ORIGIN } from "./deployment";
import { isInternalPath } from "./routes";
import { canonicalPublicPath } from "./public-paths";
export function indexNowKey(): string | null {
 const key=process.env.INDEXNOW_KEY; return key && /^[a-zA-Z0-9-]{8,128}$/.test(key) ? key : null;
}
export function indexNowUrls(paths: string[]): string[] {
 const urls = paths.flatMap(path => {
   if (!path.startsWith("/") || path.startsWith("//") || /[?#\\]/.test(path)) return [];
   try {
     const url = new URL(path, PRODUCTION_ORIGIN);
     const decoded = decodeURIComponent(url.pathname);
     if (url.origin !== PRODUCTION_ORIGIN || isInternalPath(decoded) || decoded.includes("..") || decoded.includes("//")) return [];
     return [new URL(canonicalPublicPath(url.pathname), PRODUCTION_ORIGIN).toString()];
   } catch { return []; }
 });
 return [...new Set(urls)].slice(0,10000);

}
/** Publication has already committed. A search-engine outage must not roll it back. */
export async function notifyIndexNow(paths: string[]): Promise<{state:string;count:number}> {
 const key=indexNowKey(); const urlList=indexNowUrls(paths);
 if (!isIndexableDeployment() || !key || !urlList.length) return {state:"not-configured",count:0};
 try {
  const response=await fetch("https://api.indexnow.org/indexnow",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({host:"www.keybase.com",key,keyLocation:`${PRODUCTION_ORIGIN}/indexnow-key.txt`,urlList}),signal:AbortSignal.timeout(3000)});
  return {state:response.ok ? "accepted" : `retry-${response.status}`,count:urlList.length};
 } catch { return {state:"retry-network",count:urlList.length}; }
}
