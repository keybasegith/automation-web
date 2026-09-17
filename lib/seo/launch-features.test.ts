import { afterEach, expect, it, vi } from "vitest";
import { indexNowUrls, notifyIndexNow } from "./indexnow";
import { hasJobPage, isCurrentJob } from "./jobs";
import { calculateCompoundInterest } from "@/lib/tools/compound-interest";
import { normalizeCareers } from "@/lib/cms/normalize";
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("submits only canonical public URLs",()=>{
 expect(indexNowUrls(["/services/rrsp","/rrsp","/../dashboard","/%64ashboard","//evil.test","/rrsp?q=private","/rrsp#private","/search","/foo\\evil"])) .toEqual(["https://www.keybase.com/rrsp"]);
});
it("never notifies search engines from preview",async()=>{
 vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("INDEXNOW_KEY","abcdefgh");const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
 expect((await notifyIndexNow(["/rrsp"])).state).toBe("not-configured");expect(fetch).not.toHaveBeenCalled();
});
it("returns retry state without undoing publication",async()=>{
 vi.stubEnv("VERCEL_ENV","production");vi.stubEnv("NEXT_PUBLIC_SITE_URL","https://www.keybase.com");vi.stubEnv("INDEXNOW_KEY","abcdefgh");
 vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
 expect((await notifyIndexNow(["/rrsp"])).state).toBe("retry-network");
});
const job={id:"real-opening",title:"Example",department:"Operations",location:"Richmond Hill",type:"Full-time",description:"Confirmed opening",isVisible:true,datePosted:"2026-09-01",validThrough:"2026-09-09",addressLocality:"Richmond Hill",addressRegion:"ON",confirmedOpening:true};
it("expires job pages immediately after closing date",()=>{
 expect(hasJobPage(job,new Date("2026-09-09T23:59:59Z"))).toBe(true);
 expect(hasJobPage(job,new Date("2026-09-10T00:00:00Z"))).toBe(false);
 expect(isCurrentJob({...job,isVisible:false},new Date("2026-09-09"))).toBe(false);
 expect(hasJobPage({...job,confirmedOpening:false},new Date("2026-09-09"))).toBe(false);
});
it("rejects malformed confirmed job dates at CMS boundary",()=>{
 expect(normalizeCareers({roles:[{...job,datePosted:"2026-02-31"}]})).toHaveProperty("error");
 expect(normalizeCareers({roles:[{...job,validThrough:""}]})).toHaveProperty("error");
});
it("matches the published worked example and zero-growth cash flows",()=>{
 const params={principal:10000,monthlyContribution:100,annualRate:6,years:1,compoundFreq:12,inflationRate:0,taxRate:0,contributionIncrease:0};
 expect(calculateCompoundInterest(params)[0].balance).toBe(11856.50);
 expect(calculateCompoundInterest({...params,annualRate:0})[0].balance).toBe(11200);
});
