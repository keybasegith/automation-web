/**
 * Every word Keybase Answer puts on screen.
 *
 * Centralized so the homepage module, the landing page, and the empty states
 * cannot drift apart, and so a compliance review of the feature's wording is a
 * review of one file.
 */

export const HOME_SECTION_COPY = {
  eyebrow: "New AI-Powered Feature",
  title: "Keybase Answer",
  body: "A little perspective goes a long way. Explore your financial questions through Keybase’s published insights and market commentary.",
  ctaLabel: "Ask us a question",
  ctaHref: "/keybase-answer",
} as const;

export const ANSWER_PAGE_COPY = {
  title: "Keybase Answer",
  intro: "Ask a financial question to explore our latest insights.",
  supporting:
    "Ask a question to uncover relevant Keybase insights. We'll provide a concise, source-backed answer using Keybase Financial Group's published financial content.",
  inputPlaceholder: "Ask Keybase a financial question...",
  inputLabel: "Your financial question",
  privacyHint:
    "Please don't include account numbers or other sensitive personal information.",
  /**
   * The site has no search page, so this points at the Newsroom — the real
   * index of everything Keybase publishes. Change the href here if a search
   * route is ever added; nothing else references it.
   */
  helpPrefix: "Looking for a specific page or service instead?",
  helpLinkLabel: "Browse the Newsroom",
  helpHref: "/newsroom",
  newQuestionLabel: "New question",
  skipTypingLabel: "Show full answer",
  askAnotherLabel: "Ask another question",
  tryAgainLabel: "Try again",
  sourcesHeading: "Sources",
  relatedHeading: "Continue exploring",
  relatedQuestionsHeading: "Related questions",
  feedbackPrompt: "Was this helpful?",
  feedbackThanks: "Thank you — that helps us improve Keybase Answer.",
  attribution: "Keybase Financial Group",
} as const;

export const GENERATING_COPY = {
  retrieving: "Searching Keybase insights...",
  reviewing: (count: number) =>
    count === 1 ? "Reviewing 1 relevant source..." : `Reviewing ${count} relevant sources...`,
  generating: "Preparing your answer...",
  /** Announced to assistive technology when the answer lands. */
  done: "Your answer is ready.",
} as const;

export const RATE_LIMIT_COPY = {
  heading: "You've reached the current Keybase Answer question limit.",
  body: "Please try again later.",
} as const;

export const ERROR_COPY = {
  heading: "Something went wrong while preparing your answer.",
} as const;

export const NO_ANSWER_COPY = {
  heading:
    "We couldn't find enough information in Keybase's published insights to provide a reliable answer to that question.",
  tryPrompt: "Try asking about:",
  topics: [
    "Canadian markets",
    "interest rates",
    "investing concepts",
    "wealth management",
    "financial planning",
    "Keybase's latest commentary",
  ],
} as const;

export const SEO_COPY = {
  title: "Keybase Answer | Keybase Financial Group",
  description:
    "Explore financial questions through Keybase Financial Group's published insights with Keybase Answer, an AI-powered source-backed research experience.",
} as const;
