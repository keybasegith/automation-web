import { compact, entityReference, type SchemaNode } from "./types";
import { entityId } from "../siteUrl";

export interface PostalAddressInput {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry?: string;
}

export interface OrganizationInput {
  /** The public-facing brand name, e.g. "Keybase Financial Group". */
  name: string;
  /** The registered legal name, where the site states one separately. */
  legalName?: string;
  description?: string;
  /** Absolute URL. Omitted entirely when no production domain is configured. */
  url?: string;
  /** Absolute URL to the logo file. Relative paths are not valid here. */
  logo?: string;
  telephone?: string;
  email?: string;
  address?: PostalAddressInput;
  /** Verified official profile URLs only. */
  sameAs?: string[];
  /** ISO 8601 date or year. Only when the repository states one outright. */
  foundingDate?: string;
  /** Fragment for the stable @id, e.g. "organization". */
  idFragment?: string;
}

/** schema.org node type. `Organization` unless a narrower type is warranted. */
type OrganizationType = "Organization" | "FinancialService";

function organizationNode(input: OrganizationInput, type: OrganizationType): SchemaNode {
  return compact({
    "@type": type,
    "@id": input.idFragment ? entityId(input.idFragment) : undefined,
    name: input.name,
    legalName: input.legalName,
    description: input.description,
    url: input.url,
    logo: input.logo,
    telephone: input.telephone,
    email: input.email,
    address: input.address
      ? compact({ "@type": "PostalAddress", ...input.address })
      : undefined,
    sameAs: input.sameAs,
    foundingDate: input.foundingDate,
  });
}

/** The sitewide Organization entity. */
export function buildOrganization(input: OrganizationInput): SchemaNode {
  return organizationNode(input, "Organization");
}

export interface FinancialServiceInput extends OrganizationInput {
  /** A country or region the business serves, e.g. "Canada". */
  areaServed?: string;
  /** The organization this operates under, when the site states the relationship. */
  parentOrganization?: { name: string; idFragment?: string };
}

/**
 * A `FinancialService` node — schema.org's LocalBusiness subtype for a firm
 * offering financial services from a place of business.
 *
 * Built for the location pages Keybase does not have yet. It is deliberately
 * NOT what the sitewide entity uses: LocalBusiness semantics describe a
 * business location, and the current site presents Keybase as an advisory firm
 * rather than a branch you visit. Use this when a page genuinely represents one
 * office, with that office's own address and contact details.
 */
export function buildFinancialService(input: FinancialServiceInput): SchemaNode {
  const base = organizationNode(input, "FinancialService");
  return compact({
    ...base,
    areaServed: input.areaServed
      ? { "@type": "Country", name: input.areaServed }
      : undefined,
    parentOrganization: input.parentOrganization
      ? entityReference(
          "Organization",
          input.parentOrganization.name,
          input.parentOrganization.idFragment
            ? entityId(input.parentOrganization.idFragment)
            : undefined,
        )
      : undefined,
  });
}
