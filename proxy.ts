import { NextResponse, type NextRequest } from "next/server";

import { isIndexableDeployment, PRODUCTION_ORIGIN } from "@/lib/seo/deployment";
import { canonicalPublicPath } from "@/lib/seo/public-paths";
import { isInternalPath } from "@/lib/seo/routes";

/** Canonical URLs and indexing policy; the automation workspace is public. */
export function proxy(request: NextRequest) {
  const publicRead = ["GET", "HEAD"].includes(request.method) && !isInternalPath(request.nextUrl.pathname);
  const path = canonicalPublicPath(request.nextUrl.pathname);
  const normalizeHost = isIndexableDeployment() && request.nextUrl.hostname === "keybase.com";
  const destination = new URL(request.url);
  destination.pathname = path;
  if (normalizeHost) { destination.hostname = "www.keybase.com"; destination.protocol = "https:"; destination.port = ""; }
  const response = publicRead && (path !== request.nextUrl.pathname || normalizeHost)
    ? NextResponse.redirect(destination, 301)
    : NextResponse.next();
  if (!isIndexableDeployment() || request.nextUrl.hostname !== new URL(PRODUCTION_ORIGIN).hostname || isInternalPath(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  /**
   * Everything except Next's own assets, the public file folder, and image
   * optimisation. This matcher keeps the proxy off static traffic.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pdfjs|.*\\.[a-zA-Z0-9]+$).*)"],
};
