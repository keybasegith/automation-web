/**
 * Server-startup checks (Next.js instrumentation hook).
 *
 * The CMS must never boot with a broken storage configuration and silently
 * serve fallback content, so a missing DATABASE_URL (without an explicit
 * CMS_STORE=file opt-in) fails the server here, at startup, in every
 * environment. In production the media object storage must be configured
 * too — otherwise uploads and media rendering would fail after deploy.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertCmsStorageConfigured } = await import("@/lib/cms/storage");
  assertCmsStorageConfigured();

  if (process.env.NODE_ENV === "production") {
    const { assertMediaStorageConfigured } = await import(
      "@/lib/cms/media/objectStore"
    );
    assertMediaStorageConfigured();
  }
}
