import type { Metadata } from "next";
import { notFound } from "next/navigation";

import SiteHeader from "@/components/home/SiteHeader";
import SiteFooter from "@/components/home/SiteFooter";
import KeybaseAnswerBackdrop from "@/components/keybase-answer/KeybaseAnswerBackdrop";
import KeybaseAnswerShell from "@/components/keybase-answer/KeybaseAnswerShell";
import {
  dailyRotationKey,
  selectSuggestedQuestions,
} from "@/config/keybase-answer";
import { getConfig, isFeatureEnabled } from "@/lib/keybase-answer/config";
import { SEO_COPY } from "@/lib/keybase-answer/copy";
import { absoluteUrl } from "@/lib/seo/siteUrl";

/**
 * The Keybase Answer research page.
 *
 * Rendered per request, for two reasons: the curated prompts rotate on a daily
 * key, and the feature flag has to be able to take the page down without a
 * redeploy. Neither survives static generation.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  if (!isFeatureEnabled()) {
    // Nothing to index while the feature is off, and nothing to describe.
    return { robots: { index: false, follow: false } };
  }
  const url = absoluteUrl("/keybase-answer");
  return {
    title: SEO_COPY.title,
    description: SEO_COPY.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: SEO_COPY.title,
      description: SEO_COPY.description,
      url,
      siteName: "Keybase Financial Group",
    },
    twitter: {
      card: "summary_large_image",
      title: SEO_COPY.title,
      description: SEO_COPY.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function KeybaseAnswerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Flag off means the route does not exist, rather than existing and refusing.
  if (!isFeatureEnabled()) notFound();

  const config = getConfig();
  const params = await searchParams;
  const raw = params.q;
  const shared = typeof raw === "string" ? raw.slice(0, config.maxQuestionLength) : undefined;

  /**
   * The prompts on show rotate once a day. The key is computed here, on the
   * server, and passed down: a selection made independently on both sides of
   * hydration is a selection that can disagree with itself.
   */
  const suggested = selectSuggestedQuestions(dailyRotationKey());

  return (
    <div className="font-franklin min-h-screen bg-white text-[#1a2433]">
      <SiteHeader />

      <main className="relative isolate overflow-hidden">
        <KeybaseAnswerBackdrop />
        <div className="relative px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <KeybaseAnswerShell
            suggested={suggested}
            maxQuestionLength={config.maxQuestionLength}
            initialQuestion={shared}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
