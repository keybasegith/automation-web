import { NextResponse, type NextRequest } from "next/server";

import { isIndexableDeployment, PRODUCTION_ORIGIN } from "@/lib/seo/deployment";
import { canonicalPublicPath } from "@/lib/seo/public-paths";
import { isInternalPath } from "@/lib/seo/routes";

import { requestHasValidSession } from "@/lib/auth/session";
import { isProtectedApi, isProtectedPage } from "@/lib/auth/routes";

/**
 * Route-level authentication for the internal dashboard.
 *
 * In Next 16 this file is `proxy.ts` — the `middleware` convention was renamed,
 * and the proxy runtime is Node.js and cannot be configured, so Node's crypto
 * is available here and the session check is the same code the routes use.
 *
 * This is the outer gate: it turns away sessionless requests before a page
 * renders or a handler runs. It is not the only gate. Following the framework's
 * own guidance, the authoritative check lives beside the data — `getCurrentUser`
 * for pages, `requireApiUser` / `requireInternalAiUser` for routes — so a
 * mistake in the matcher below cannot on its own open an endpoint.
 *
 * Which paths are internal is defined in lib/auth/routes.ts, not here.
 */
export function proxy(request: NextRequest) {
  const publicRead = ["GET", "HEAD"].includes(request.method) && !isInternalPath(request.nextUrl.pathname);
  const path = canonicalPublicPath(request.nextUrl.pathname);
  const normalizeHost = isIndexableDeployment() && request.nextUrl.hostname === "keybase.com";
  const destination = new URL(request.url);
  destination.pathname = path;
  if (normalizeHost) { destination.hostname = "www.keybase.com"; destination.protocol = "https:"; destination.port = ""; }
  const response = publicRead && (path !== request.nextUrl.pathname || normalizeHost)
    ? NextResponse.redirect(destination, 301)
    : authenticatedResponse(request);
  if (!isIndexableDeployment() || request.nextUrl.hostname !== new URL(PRODUCTION_ORIGIN).hostname || isInternalPath(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

function authenticatedResponse(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const needsSession = isProtectedApi(pathname) || isProtectedPage(pathname);
  if (!needsSession) return NextResponse.next();

  if (requestHasValidSession(request)) return NextResponse.next();

  // An API caller gets a status it can act on; redirecting a fetch to an HTML
  // login page would surface as an unreadable parse error.
  if (isProtectedApi(pathname)) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  const login = new URL("/login", request.url);
  // Where they were headed, so sign-in can return them there.
  login.searchParams.set("next", `${pathname}${search}`);
  const response = NextResponse.redirect(login);
  response.headers.set("cache-control", "no-store");
  return response;
}

export const config = {
  /**
   * Everything except Next's own assets, the public file folder, and image
   * optimisation. The proxy still decides per path whether a session is
   * needed; this matcher only keeps it off static traffic.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pdfjs|.*\\.[a-zA-Z0-9]+$).*)"],
};
