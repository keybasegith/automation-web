import { indexNowKey } from "@/lib/seo/indexnow";
export const dynamic="force-dynamic";
export function GET() {
 const key=indexNowKey();
 return new Response(key ?? "Not found",{status:key ? 200 : 404,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex"}});
}
