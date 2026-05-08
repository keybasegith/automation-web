import type { EventType, GenerateEmailRequest } from "@/lib/email/types";

interface MockEmail {
  subject: string;
  body: string;
}

const TEMPLATES: Record<EventType, MockEmail> = {
  "Market Drop": {
    subject: "A note on this week's market movement",
    body: `Dear {firstName},

I'm reaching out following the recent market volatility you may have noticed. Short-term movements like this are an expected part of investing, and your portfolio was constructed with moments like these in mind. The diversified, long-term framework we put in place together is designed precisely to help weather periods of uncertainty.

I want to assure you that nothing about your underlying plan has changed. While headlines can feel unsettling, the fundamentals of your strategy — its alignment with your goals, your risk tolerance, and your time horizon — remain the same.

That said, your peace of mind matters as much as the numbers. If you'd like to talk through what you're seeing, ask questions about how your portfolio is positioned, or simply review where things stand, I'm here. We can schedule a call at your convenience, even briefly.

Please don't hesitate to reach out anytime. As always, I appreciate the trust you've placed in our work together, and I'm here whenever you'd like to connect.

Warm regards,
Your Keybase Advisor`,
  },
  "Market Rally": {
    subject: "A quick note on recent market gains",
    body: `Dear {firstName},

You may have noticed that markets have been performing well recently, and I wanted to take a moment to share some perspective. Periods of strong performance are a welcome sign, but they also tend to amplify both excitement and the temptation to react.

Your portfolio is positioned according to the long-term plan we built around your goals and time horizon. Whether markets rise or fall, the discipline we've put in place — diversification, periodic rebalancing, and alignment with your priorities — is what tends to serve clients best across full market cycles.

If recent gains prompt any questions, or if you've experienced changes in your personal circumstances that might affect how you think about your goals, I'd love to talk. Even a brief conversation can be a useful checkpoint when things are moving favorably.

Thank you, as always, for the trust you place in our partnership. I'm available whenever you'd like to connect.

Warm regards,
Your Keybase Advisor`,
  },
  "Portfolio Change": {
    subject: "Update on a recent change to your portfolio",
    body: `Dear {firstName},

I'm writing to let you know about a recent adjustment within your portfolio, made in the normal course of maintaining your long-term strategy. Adjustments like this are part of the ongoing work of keeping your investments aligned with your goals, risk tolerance, and time horizon.

Nothing about the broader plan has changed — this is part of routine portfolio stewardship rather than a response to short-term market movements. Your overall strategy remains consistent with what we've discussed and agreed upon together over our time working together.

If you'd like to walk through the details of the change, understand the reasoning behind it, or revisit any aspect of your plan, please reach out at any time. I'm always happy to schedule a call so we can talk through it together at a pace that works for you.

Thank you for your continued trust. Looking forward to staying in close touch as always.

Warm regards,
Your Keybase Advisor`,
  },
  "Retirement Approaching": {
    subject: "Looking ahead to your retirement transition",
    body: `Dear {firstName},

As you approach this important milestone, I wanted to reach out and check in. The transition into retirement is one of the most meaningful financial moments most people experience, and it tends to bring both excitement and a fair number of questions along the way.

Over the years, we've worked together to build a plan designed to support you through this next stage of life. As we get closer, this is a natural moment to review where things stand, talk through your priorities for the chapters ahead, and make sure your strategy reflects what matters most to you now.

I'd love to schedule a conversation when it works for you. There are typically a few topics worth discussing as retirement gets closer, and I want to make sure we have time to cover them thoughtfully and answer any questions that may be on your mind.

Thank you for the trust you've placed in our work together. I'm looking forward to walking through this transition with you.

Warm regards,
Your Keybase Advisor`,
  },
  "General Check-in": {
    subject: "Just checking in",
    body: `Dear {firstName},

I wanted to take a moment to reach out — not in response to anything specific, just to check in. Periodic conversations are some of the most valuable parts of our work together, and I find that the most useful planning often happens between formal reviews, in moments like this one.

Your portfolio remains aligned with the long-term plan we've built around your goals and time horizon. As markets have moved through their normal rhythms, your strategy has continued to do what it was designed to do, quietly and steadily.

That said, life changes — sometimes in ways that may affect what you want from your plan. If anything has shifted recently, whether in your career, your family, or your priorities, I'd love to hear about it. Even small changes can be worth incorporating into how we think ahead.

Please feel free to reach out anytime. I'm happy to schedule a call whenever it suits you, or simply respond by email with anything on your mind.

Warm regards,
Your Keybase Advisor`,
  },
  "Document Refresh": {
    subject: "Action requested: please update your account documents",
    body: `Dear {firstName},

I'm reaching out as a routine follow-up on your account records. As part of our ongoing compliance and regulatory obligations, we periodically review the documents we hold on file for each client to ensure everything is current and accurate.

A review of your account indicates that one or more of your documents are either expiring soon or have already lapsed. Keeping these up to date is a standard requirement and helps us continue to serve you without any interruption to your account services.

I'd appreciate it if you could take a few minutes to provide the updated information at your earliest convenience. I'm happy to walk you through what's needed, share secure submission instructions, or schedule a brief call if that's easier — whatever works best for you.

Please let us know if you have any questions. We want to make this as straightforward as possible, and I'm here to help with any part of the process.

Thank you for your continued trust and partnership.

Warm regards,
Your Keybase Advisor`,
  },
};

const MIN_DELAY_MS = 800;
const MAX_DELAY_MS = 1500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const firstNameOf = (fullName: string): string => {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
};

/**
 * Returns a deterministic-but-realistic email draft for demo purposes.
 * Activated by MOCK_AI=true, which lets the rest of the pipeline (DB
 * persistence, audit logging, approve/send lifecycle) run without an
 * OpenAI key.
 */
export async function generateMockEmail(
  input: GenerateEmailRequest
): Promise<MockEmail> {
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  await wait(delay);

  const template = TEMPLATES[input.event.eventType];
  const firstName = firstNameOf(input.client.clientName);
  const body = template.body.replace(/\{firstName\}/g, firstName);

  return {
    subject: template.subject,
    body,
  };
}
