import { afterEach, expect, it, vi } from "vitest";
import { POST as contact } from "@/app/api/contact/route";
import { POST as advisor } from "@/app/api/become-an-advisor/route";
import { POST as careers } from "@/app/api/careers/route";
import { readSmallJson, rateLimited } from "./request";
let counter=0;
function request(body:unknown,origin="https://www.keybase.com") {return new Request("https://www.keybase.com/api/contact",{method:"POST",headers:{"Content-Type":"application/json",origin,"x-real-ip":`test-${++counter}`},body:JSON.stringify(body)});}
const inquiry={firstName:"Test",lastName:"Person",email:"test@example.test",message:"Local test only",consent:true};
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
it("rejects malformed objects and unexpected field types without delivery",async()=>{
 for(const post of [contact,advisor,careers]) {
 expect((await post(request(null))).status).toBe(400);
 expect((await post(request({...inquiry,name:"Test",phone:{bad:true}}))).status).toBe(400);
 }
});
it("rejects cross-origin submissions",async()=>{
 for(const post of [contact,advisor,careers]) expect((await post(request(inquiry,"https://other.test"))).status).toBe(403);
});
it("does not claim success without a configured delivery channel",async()=>{
 vi.stubEnv("CONTACT_INQUIRY_WEBHOOK_URL","");vi.stubEnv("ADVISOR_APPLICATION_WEBHOOK_URL","");vi.stubEnv("CAREERS_APPLICATION_WEBHOOK_URL","");
 expect((await contact(request(inquiry))).status).toBe(503);
 expect((await advisor(request({name:"Test",email:"test@example.test",consent:true}))).status).toBe(503);
 expect((await careers(request({...inquiry,position:"General Application"}))).status).toBe(503);
});
it("reports delivery failure without logging inquiry contents",async()=>{
 vi.stubEnv("CONTACT_INQUIRY_WEBHOOK_URL","https://delivery.example.test");vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("private upstream error",{status:500})));const log=vi.spyOn(console,"error").mockImplementation(()=>{});
 expect((await contact(request(inquiry))).status).toBe(502);expect(JSON.stringify(log.mock.calls)).not.toContain(inquiry.email);expect(JSON.stringify(log.mock.calls)).not.toContain(inquiry.message);
});
it("acknowledges only successful delivery",async()=>{
 vi.stubEnv("CONTACT_INQUIRY_WEBHOOK_URL","https://delivery.example.test");vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(null,{status:204})));
 expect(await (await contact(request(inquiry))).json()).toMatchObject({ok:true,forwarded:true});
});
it("caps request bodies and repeated submissions",async()=>{
 await expect(readSmallJson(request({large:"x".repeat(17000)}))).rejects.toThrow();
 const req=request(inquiry);for(let i=0;i<5;i++)expect(rateLimited(req)).toBe(false);expect(rateLimited(req)).toBe(true);
});
