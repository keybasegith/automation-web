/** The automation workspace is intentionally accessible without login.
 * CMS and content publishing retain their independent access controls.
 */
export const PROTECTED_PAGE_PREFIXES: readonly string[] = [];
export const PROTECTED_API_PREFIXES: readonly string[] = [];

/**
 * Paths inside a protected prefix that must stay reachable without a
 * dashboard session. Each one is here for a stated reason — nothing is
 * exempted by accident.
 */
export const PUBLIC_EXCEPTIONS: readonly { path: string; why: string }[] = [
  {
    // A client signs a document from an emailed link. They are not staff and
    // have no dashboard account; the single-use token in the URL is the
    // credential. Protecting this would break external signing outright.
    path: "/api/onboarding/sign",
    why: "external signer, authenticated by the token in the link",
  },
  {
    // Same, for the onboarding wizard's documents: the client signs, and opens
    // the documents they are signing, from a link. The token is checked for
    // expiry and spent on use (app/api/client-onboarding/sign/[token]).
    path: "/api/client-onboarding/sign",
    why: "external signer, authenticated by the token in the link",
  },
];

const startsWithSegment = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function isPublicException(pathname: string): boolean {
  return PUBLIC_EXCEPTIONS.some((exception) =>
    startsWithSegment(pathname, exception.path)
  );
}

export function isProtectedApi(pathname: string): boolean {
  if (isPublicException(pathname)) return false;
  return PROTECTED_API_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));
}

export function isProtectedPage(pathname: string): boolean {
  if (isPublicException(pathname)) return false;
  return PROTECTED_PAGE_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));
}

/** Whether a request to this path needs a dashboard session at all. */
export function requiresSession(pathname: string): boolean {
  return isProtectedApi(pathname) || isProtectedPage(pathname);
}
