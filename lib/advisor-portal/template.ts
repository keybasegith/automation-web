export const DEFAULT_ADVISOR_PROFILE = {
  firstName: "Johnathan",
  lastName: "Leung",
  title: "Financial Advisor",
  company: "Keybase Financial Group",
  tagline: "Building and Preserving Personal Wealth",
  // Practice focus areas shown under the name in the hero.
  specialties:
    "Wealth Management · Retirement & Estate Planning · Investment Strategy",
  profilePhoto: "/johnathan-profile1.jpg",
  companyLogo: "/keybase-logo-nobg.png",
  address: {
    line1: "1725 16th Avenue, Suite 101",
    line2: "Richmond Hill, ON L4B 0B3",
  },
  contact: {
    phone: "905-709-7911 Ext. 2222",
    cell: "647-242-7524",
    email: "jleung@keybase.com",
  },
  // Edit these to reflect Johnathan's real numbers.
  metrics: [
    { value: "15+", label: "Years of Experience" },
    { value: "500+", label: "Clients & Families Served" },
    { value: "$250M+", label: "Assets Under Management" },
    { value: "98%", label: "Client Retention Rate" },
  ],
  // A short, personal first-person message from Johnathan (one entry per line).
  aspirationLines: [
    "My goal is simple: to help every client and their family achieve true financial confidence.",
    "I believe wealth is not just about numbers on a statement — it is about the freedom",
    "to live well today and the peace of mind that the people you love are protected tomorrow.",
    "I am committed to building lasting, honest relationships and",
    "to treating your goals as if they were my own.",
  ],
  // Placeholder — replace with the official Keybase company description when ready (one entry per line).
  companyDescriptionLines: [
    "Keybase Financial Group is a full-service financial firm dedicated to helping",
    "individuals, families, and business owners build and preserve personal",
    "wealth. Through tailored planning, disciplined investing, and a",
    "relationship-first approach, our advisors deliver guidance you can trust",
    "at every stage of life.",
  ],
};
export type AdvisorTemplateProfile = typeof DEFAULT_ADVISOR_PROFILE & {
  backgroundPhoto?: string;
  brandColor?: string;
  goldColor?: string;
  noteLabel?: string;
  noteHeading?: string;
  contactHeading?: string;
  contactIntro?: string;
  cta?: string;
  footerDisclosure?: string;
  sections?: { title: string; body: string }[];
};
