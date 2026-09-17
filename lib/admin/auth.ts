import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { verifyPassword } from "@/lib/content/password";
export const ADMIN_COOKIE_NAME = "kb_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;
export interface AdminUser {email:string;passwordHash:string;}
function configuredUser():AdminUser|null {
 const email=process.env.CMS_ADMIN_EMAIL?.trim().toLowerCase();
 const passwordHash=process.env.CMS_ADMIN_PASSWORD_HASH;
 if(!email || !passwordHash?.startsWith("scrypt$") || (process.env.ADMIN_SESSION_SECRET?.length ?? 0)<32) return null;
 return {email,passwordHash};
}
export function cmsAdminConfigured():boolean {return configuredUser() !== null;}
export async function verifyCredentials(email:unknown,password:unknown):Promise<AdminUser|null> {
 const user=configuredUser();
 if(!user || typeof email!=="string" || typeof password!=="string" || password.length>1024 || email.trim().toLowerCase()!==user.email) return null;
 return await verifyPassword(password,user.passwordHash) ? user : null;
}
function signature(user:AdminUser,value:string):string {
 return createHmac("sha256",process.env.ADMIN_SESSION_SECRET!).update(`${user.email}:${user.passwordHash}:${value}`).digest("hex");
}
export function sessionTokenFor(user:AdminUser):string {
 if(!cmsAdminConfigured()) throw new Error("CMS administrator is not configured.");
 const payload=`${Math.floor(Date.now()/1000)}.${randomBytes(16).toString("hex")}`;
 return `${payload}.${signature(user,payload)}`;
}
export function isValidSessionToken(value:string|null|undefined):boolean {
 const user=configuredUser();if(!user || !value || !/^\d{10}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(value)) return false;
 const [issued,nonce,mac]=value.split(".");const age=Math.floor(Date.now()/1000)-Number(issued);
 if(age < -30 || age >= ADMIN_SESSION_MAX_AGE) return false;
 return timingSafeEqual(Buffer.from(mac,"hex"),Buffer.from(signature(user,`${issued}.${nonce}`),"hex"));
}
function tokenFromRequest(req:Request):string|null {
 const entry=req.headers.get("cookie")?.split(/;\s*/).find(c=>c.startsWith(`${ADMIN_COOKIE_NAME}=`));
 try {return entry ? decodeURIComponent(entry.slice(ADMIN_COOKIE_NAME.length+1)) : null;} catch {return null;}
}
export function adminUserFromRequest(req:Request):string|null {return isValidSessionToken(tokenFromRequest(req)) ? configuredUser()!.email : null;}
export function requestHasAdminSession(req:Request):boolean {return adminUserFromRequest(req)!==null;}
