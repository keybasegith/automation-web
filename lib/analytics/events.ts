export type EventName = "generate_lead" | "form_start" | "advisor_click" | "phone_click" | "email_click" | "calculator_use" | "calculator_complete" | "advisor_profile_view" | "article_service_click" | "article_advisor_click";
declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; } }
export function trackEvent(name: EventName, fields: {form_name?: "contact"; tool_name?: "compound_interest"} = {}) {
  if (typeof window === "undefined" || !window.gtag) return;
  try { if (localStorage.getItem("keybase-analytics-consent") !== "granted") return; } catch { return; }
  window.gtag("event", name, { ...fields, page_location: location.origin + location.pathname, page_referrer: document.referrer ? new URL(document.referrer).origin : "" });
}
