import { DEFAULT_ADVISOR_PROFILE as template } from "./template";
export const COMPANY_DESCRIPTION = template.companyDescriptionLines.join(" ");
export const DEFAULT_STATS = template.metrics.map((stat) => ({ ...stat, value: "0" }));
export const lockBranding = (page) => ({ ...page, logo: template.companyLogo, accent: "#006d6e", gold: "#c8a96a" });
export const EMPTY_PAGE = {
  name: template.firstName + " " + template.lastName,
  credentials: template.title,
  headline: template.tagline,
  intro: template.specialties,
  bio: template.aspirationLines.join("\n"),
  email: template.contact.email,
  phone: template.contact.phone,
  cell: template.contact.cell,
  address: template.address.line1 + "\n" + template.address.line2,
  cta: "Book a Consultation",
  accent: "#006d6e",
  gold: "#c8a96a",
  background: "/profile-backgroundpic.jpg",
  portrait: template.profilePhoto,
  logo: template.companyLogo,
  company: template.company,
  noteLabel: "A Note from " + template.firstName,
  noteHeading: "My Commitment to You",
  contactHeading: "Let’s Build Your Future Together",
  contactIntro:
    "Reach out today to start a conversation about your financial goals.",
  footerDisclosure: "Keybase Financial Group Inc. is a member of CIRO",
  stats: template.metrics,
  sections: [],
};
export function toTemplate(page, organization) {
  const [firstName, ...rest] = page.name.split(" ");
  return {
    ...template,
    firstName,
    lastName: rest.join(" "),
    title: page.credentials,
    tagline: page.headline,
    specialties: page.intro,
    profilePhoto: page.portrait,
    companyLogo: template.companyLogo,
    company: page.company,
    backgroundPhoto: page.background,
    brandColor: "#006d6e",
    goldColor: "#c8a96a",
    contact: { email: page.email, phone: page.phone, cell: page.cell },
    address: {
      line1: page.address.split("\n")[0],
      line2: page.address.split("\n").slice(1).join(", "),
    },
    metrics: page.stats,
    aspirationLines: page.bio.split("\n"),
    companyDescriptionLines: [organization],
    cta: page.cta,
    noteLabel: page.noteLabel,
    noteHeading: page.noteHeading,
    contactHeading: page.contactHeading,
    contactIntro: page.contactIntro,
    footerDisclosure: page.footerDisclosure,
    sections: page.sections,
  };
}
export const STATUS = {
  submitted: "In compliance review",
  returned: "Changes requested",
  approved: "Ready for IT",
  published: "Published",
};
export function transition(request, role, action, note = "") {
  const next = { ...request };
  if (
    role === "compliance" &&
    request.status === "submitted" &&
    ["approve", "return"].includes(action)
  ) {
    if (action === "return" && !note.trim())
      throw Error("Add a note explaining what the advisor needs to change.");
    next.status = action === "approve" ? "approved" : "returned";
  } else if (
    role === "it" &&
    request.status === "approved" &&
    action === "publish"
  )
    next.status = "published";
  else
    throw Error(
      "This action is not available for this role or submission status.",
    );
  return next;
}
export function validatePage(page) {
  if (!page.name?.trim() || !page.headline?.trim())
    throw Error("Add an advisor name and headline before submitting.");
}

export function newAdvisorDraft(user) {
  return {
    ...EMPTY_PAGE,
    name: user.name,
    email: "",
    phone: "",
    cell: "",
    address: "",
    portrait: "",
    stats: structuredClone(DEFAULT_STATS),
    bio: "",
    noteLabel: "A Note from " + user.name.split(" ")[0],
  };
}
