"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/events";
import { SERVICE_SLUGS } from "@/lib/seo/public-paths";
import { isInternalPath } from "@/lib/seo/routes";
const key = "keybase-analytics-consent";
export default function ConsentAnalytics({id}: {id?: string}) {
  const path = usePathname();
  const [mounted,setMounted] = useState(false);
  const [consent,setConsent] = useState<string | null>(null);
  useEffect(() => { queueMicrotask(()=>setMounted(true)); try { const value=localStorage.getItem(key); queueMicrotask(()=>setConsent(value)); } catch {} },[]);
  const active = Boolean(mounted && typeof window !== "undefined" && location.origin === "https://www.keybase.com" && id && /^G-[A-Z0-9]+$/.test(id) && !isInternalPath(path));
  const choose = (value: string) => {
    try { localStorage.setItem(key,value); } catch {}
    setConsent(value);
    if (value !== "granted") {
      window.gtag?.("consent","update",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
      location.reload();
    }
  };
  useEffect(() => {
    if (!active || consent !== "granted" || !window.gtag) return;
    window.gtag("event","page_view",{page_location:location.origin+path,page_referrer:document.referrer ? new URL(document.referrer).origin : ""});
    if (document.querySelector("[data-advisor-profile=true]")) trackEvent("advisor_profile_view");
  },[path,active,consent]);
  useEffect(() => {
    if (!active || consent !== "granted") return;
    const onClick=(event:MouseEvent)=>{
      const link=(event.target as Element)?.closest?.("a"); if (!link) return;
      const href=link.getAttribute("href")||"";
      if (path.startsWith("/newsroom/") && SERVICE_SLUGS.some(slug=>href === `/${slug}`)) trackEvent("article_service_click");
      if (href.startsWith("tel:")) trackEvent("phone_click");
      else if (href.startsWith("mailto:")) trackEvent("email_click");
      else if (href.startsWith("/contact") || href.startsWith("/our-advisors")) trackEvent(path.startsWith("/newsroom/") ? "article_advisor_click" : "advisor_click");
    };
    document.addEventListener("click",onClick); return ()=>document.removeEventListener("click",onClick);
  },[active,consent,path]);
  if (!active) return null;
  return <>
    {consent === "granted" && <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" onReady={()=>{
      window.dataLayer=window.dataLayer||[];
      // gtag expects an Arguments object on the data layer.
      // eslint-disable-next-line prefer-rest-params
      window.gtag=function(){window.dataLayer?.push(arguments);};
      window.gtag("consent","default",{analytics_storage:"granted",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
      window.gtag("js",new Date());
      window.gtag("config",id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
      window.gtag("event","page_view",{page_location:location.origin+path,page_referrer:document.referrer ? new URL(document.referrer).origin : ""});
      if (document.querySelector("[data-advisor-profile=true]")) trackEvent("advisor_profile_view");
    }} />}
    {consent === null ? <aside aria-label="Analytics preferences" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-lg border bg-white p-5 text-sm text-[#0a1f33] shadow-lg">
      <p>May we use optional analytics to understand how this website is used? Your choice does not affect access. <a href="/privacy" className="underline">Privacy policy</a></p>
      <div className="mt-3 flex gap-3"><button onClick={()=>choose("granted")} className="min-h-11 border px-4">Allow analytics</button><button onClick={()=>choose("denied")} className="min-h-11 border px-4">Decline</button></div>
    </aside> : <button className="block px-5 py-3 text-sm underline" onClick={()=>choose(consent === "granted" ? "denied" : "granted")}>{consent === "granted" ? "Disable optional analytics" : "Enable optional analytics"}</button>}
  </>;
}
