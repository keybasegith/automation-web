/**
 * The informational-content disclaimer for educational and market articles.
 *
 * The wording is assembled from clauses already approved and published in the
 * site footer (the CMS `footerDescription`): investments carry market risk
 * including possible loss of principal, past performance is not a guarantee of
 * future results, and the site is informational rather than an offer or
 * solicitation. The one addition is the sentence distinguishing general
 * education from personalized advice, which mirrors the language already used
 * on the contact form and the compound interest calculator.
 *
 * It does not weaken anything: the sitewide footer disclosure still renders
 * beneath it on every page. Flagged for compliance sign-off before launch.
 */
export default function ArticleDisclaimer() {
  return (
    <section
      aria-labelledby="article-disclaimer"
      className="mt-14 border-t border-black/10 pt-8"
    >
      <h2
        id="article-disclaimer"
        className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]"
      >
        Important Information
      </h2>
      <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-[#7a828d]">
        This article is general information for educational purposes only. It is
        not personalized financial, investment, tax, insurance, or legal advice,
        and it does not constitute an offer or solicitation in any jurisdiction.
        Investments are subject to market risk, including the possible loss of
        principal, and past performance is not a guarantee of future results.
        Your circumstances are specific to you — speak with a qualified advisor
        before acting on anything you read here.
      </p>
    </section>
  );
}
