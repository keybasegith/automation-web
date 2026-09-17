export const PRODUCTION_ORIGIN = "https://www.keybase.com";

/** Canonical identity is independent of permission to index a deployment. */
export function isIndexableDeployment(): boolean {
  if (process.env.SEO_INDEXING_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") !== PRODUCTION_ORIGIN) return false;
  // Preview deployments often inherit the production canonical origin.
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.SITE_DEPLOYMENT_ENV === "production";
}
