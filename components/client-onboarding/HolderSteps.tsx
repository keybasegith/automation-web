"use client";

/**
 * The account-holder screens: who they are, how they were identified, and
 * their work and family. Each takes Client A or Client B, so the joint holder's
 * step is these same screens pointed at Section B of the NAAF.
 */

import {
  CITIZENSHIPS,
  ENTITY_TYPES,
  GENDERS,
  HAS_SPOUSE,
  MARITAL_STATUSES,
  PEP_ASSOCIATE_QUESTION,
  PEP_QUESTION,
  PERSON_TITLES,
  RELATIONSHIPS_TO_A,
  TAX_RESIDENCE_NOTICE,
  type EntityType,
  type PersonTitle,
} from "@/lib/naaf/config";
import { fieldIds, isEntity } from "@/lib/naaf/completeness";
import type { HolderInfo, NaafState } from "@/lib/naaf/types";
import { ageFromDob } from "@/lib/new-account/sync";

import { Checkbox, Choice, FillsNote, Grid, Section, Select, TextInput, YesNo } from "./fields";

export const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;

const ID_TYPES = [
  "Driver's Licence",
  "Passport",
  "Provincial Photo ID Card",
  "Permanent Resident Card",
  "Canadian Citizenship Card",
  "Secure Certificate of Indian Status",
  "NEXUS Card",
] as const;

type Holder = "A" | "B";

interface HolderStepProps {
  holder: Holder;
  naaf: NaafState;
  onNaaf: (update: (prev: NaafState) => NaafState) => void;
}

const useHolder = ({ holder, naaf, onNaaf }: HolderStepProps) => {
  const key = holder === "A" ? "clientA" : "clientB";
  const info = naaf[key];
  const set = (changes: Partial<HolderInfo>) => onNaaf((prev) => ({ ...prev, [key]: { ...prev[key], ...changes } }));
  const id = (field: keyof HolderInfo) => fieldIds.holder(holder, field);
  const text = (field: keyof HolderInfo) => ({
    id: id(field),
    value: info[field] as string,
    onChange: (value: string) => set({ [field]: value }),
  });
  return { info, set, id, text };
};

// ---------------------------------------------------------------- who

export function HolderDetailsStep(
  props: HolderStepProps & {
    corporate?: boolean;
    /** Only the individual CRQ takes its age question from the NAAF (the joint one asks about two people). */
    dobAnswersCrq?: boolean;
  },
) {
  const { holder } = props;
  const { info, set, id, text } = useHolder(props);
  const entity = holder === "A" && (props.corporate || isEntity(info.holderType));
  const age = entity ? null : ageFromDob(info.dob);

  return (
    <div className="flex flex-col gap-4">
      {holder === "B" && (
        <Section title="Relationship">
          <Grid>
            <Choice
              id={id("relationshipToA")}
              label="Relationship to the account holder"
              options={RELATIONSHIPS_TO_A}
              value={info.relationshipToA}
              onChange={(relationshipToA) => set({ relationshipToA })}
            />
            {info.relationshipToA === "Other" && (
              <TextInput {...text("relationshipOther")} label="Describe the relationship" />
            )}
          </Grid>
          <p className="mt-3 text-[12.5px] text-slate-500">
            Include POAs, executors, owners &amp; officers of corporations, beneficiaries &amp; trustees of formal trusts.
          </p>
        </Section>
      )}

      {entity ? (
        <Section title="Entity" description="The legal name goes in the NAAF's Surname (Corporation/Organization name) box.">
          <Grid>
            <Select<EntityType>
              id={id("holderType")}
              label="Type of entity"
              options={ENTITY_TYPES}
              value={isEntity(info.holderType) ? (info.holderType as EntityType) : null}
              onChange={(holderType) => set({ holderType })}
            />
            <TextInput {...text("surname")} label="Legal name of the corporation or organization" autoComplete="organization" />
            <TextInput {...text("sin")} label="Business Number (BN) / Trust Number (TN)" />
            <TextInput {...text("dob")} label="Nature of business" hint="Printed in place of D.O.B. for corporations." />
          </Grid>
          {holder === "A" && <FillsNote>Also fills the CRQ&apos;s Corporation/Entity&apos;s Name</FillsNote>}
        </Section>
      ) : (
        <Section title="Personal details">
          <Grid cols={3}>
            <Select<PersonTitle>
              id={id("holderType")}
              label="Title"
              options={PERSON_TITLES}
              value={info.holderType && !isEntity(info.holderType) ? (info.holderType as PersonTitle) : null}
              onChange={(holderType) => set({ holderType })}
            />
            <Choice id={id("gender")} label="Gender" options={GENDERS} value={info.gender} onChange={(gender) => set({ gender })} />
            <div />
            <TextInput {...text("firstName")} label="First name" autoComplete="given-name" />
            <TextInput {...text("initials")} label="Initials" optional />
            <TextInput {...text("surname")} label="Surname" autoComplete="family-name" />
            <TextInput
              {...text("dob")}
              label="Date of birth"
              placeholder="mm/dd/yyyy"
              hint={age !== null ? `Age ${age}` : "Month / day / year, as printed on the NAAF"}
            />
            <TextInput {...text("sin")} label="SIN / TIN" inputMode="numeric" />
          </Grid>
          {holder === "A" && (
            <FillsNote>
              Name also fills the CRQ header{props.dobAnswersCrq ? " · date of birth answers CRQ Question 1" : ""}
            </FillsNote>
          )}
          {holder === "B" && <FillsNote>Name also fills the joint CRQ&apos;s Joint Account Holder&apos;s Name</FillsNote>}
        </Section>
      )}

      <Section title="Address">
        {holder === "B" && (
          <Checkbox
            id={id("addressSameAsA")}
            checked={info.addressSameAsA}
            onChange={(addressSameAsA) => set({ addressSameAsA })}
            className="mb-4"
          >
            Same address as the account holder
          </Checkbox>
        )}
        {!info.addressSameAsA && (
          <Grid cols={4}>
            <TextInput {...text("address")} label="Street address" autoComplete="street-address" className="@3xl:col-span-2" />
            <TextInput {...text("apt")} label="Apt. / unit" optional />
            <TextInput {...text("city")} label="City" autoComplete="address-level2" />
            <Select
              id={id("province")}
              label="Province"
              options={PROVINCES}
              value={(PROVINCES as readonly string[]).includes(info.province) ? (info.province as (typeof PROVINCES)[number]) : null}
              onChange={(province) => set({ province: province ?? "" })}
            />
            <TextInput {...text("postalCode")} label="Postal code" autoComplete="postal-code" />
          </Grid>
        )}
      </Section>

      <Section title="Contact" description="At least one phone number.">
        <Grid cols={4}>
          <TextInput {...text("cellPhone")} label="Cell phone" type="tel" inputMode="tel" optional />
          <TextInput {...text("homePhone")} label="Home phone" type="tel" inputMode="tel" optional />
          <TextInput {...text("businessPhone")} label="Business phone" type="tel" inputMode="tel" optional />
          <TextInput {...text("email")} label="Email" type="email" inputMode="email" autoComplete="email" />
        </Grid>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- identification

export function IdentityStep(props: HolderStepProps & { corporate?: boolean }) {
  const { holder } = props;
  const { info, set, id, text } = useHolder(props);
  const entity = holder === "A" && (props.corporate || isEntity(info.holderType));

  return (
    <div className="flex flex-col gap-4">
      <Section
        title="ID verification"
        description="ID verified and on file must be authentic, valid and current."
      >
        <Choice
          id={id("idMethod")}
          label="Verification method"
          options={["photo", "dual", "credit"] as const}
          labels={{ photo: "Photo ID", dual: "Dual source (2 documents)", credit: "Credit check" }}
          value={info.idMethod}
          onChange={(idMethod) => set({ idMethod })}
        />
        <div className="mt-4">
          <Grid cols={3}>
            <div>
              <TextInput {...text("idType")} label="ID type" placeholder="e.g. Driver's Licence" list={`${id("idType")}-list`} />
              <datalist id={`${id("idType")}-list`}>
                {ID_TYPES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <TextInput {...text("documentId")} label="Document ID #" />
            <TextInput {...text("issuingCountry")} label="Issuing country" placeholder="Canada" />
            <TextInput {...text("jurisdiction")} label="Jurisdiction" placeholder="e.g. ON" optional={info.idMethod !== "photo"} />
            <TextInput {...text("placeOfIssue")} label="Place of issue" optional={info.idMethod !== "photo"} />
            <div />
            <TextInput {...text("dateOfIssue")} label="Date of issue" type="date" optional={info.idMethod !== "photo"} />
            <TextInput {...text("dateOfExpiry")} label="Date of expiry" type="date" />
          </Grid>
        </div>
      </Section>

      <Section title="Declarations" description={TAX_RESIDENCE_NOTICE}>
        <div className="flex flex-col gap-4">
          <YesNo id={id("pep")} label={PEP_QUESTION} value={info.pep} onChange={(pep) => set({ pep })} />
          <YesNo
            id={id("pepAssociate")}
            label={PEP_ASSOCIATE_QUESTION}
            value={info.pepAssociate}
            onChange={(pepAssociate) => set({ pepAssociate })}
          />
          {(info.pep === "Yes" || info.pepAssociate === "Yes") && (
            <p className="rounded-[7px] bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              Complete the PEP/HIO Declaration for this client.
            </p>
          )}
        </div>
      </Section>

      {!entity && (
        <Section title="Citizenship">
          <Grid>
            <Choice
              id={id("citizenship")}
              options={CITIZENSHIPS}
              value={info.citizenship}
              onChange={(citizenship) => set({ citizenship })}
            />
            {info.citizenship === "Other" && <TextInput {...text("citizenshipOther")} label="Country of citizenship" />}
          </Grid>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- employment & family

export function EmploymentStep(props: HolderStepProps) {
  const { holder, naaf } = props;
  const { info, set, id, text } = useHolder(props);
  const hasSpouse = info.maritalStatus !== null && HAS_SPOUSE.includes(info.maritalStatus);
  // The printed spouse lines are for a spouse who is not the other applicant.
  const spouseIsCoApplicant = naaf.hasJointHolder && naaf.clientB.relationshipToA === "Spouse";

  return (
    <div className="flex flex-col gap-4">
      <Section title="Employment">
        <Grid>
          <TextInput {...text("employer")} label="Employer" hint="Enter “Retired” or “Self-employed” where that applies." />
          <TextInput {...text("occupation")} label="Occupation" />
          <TextInput {...text("businessType")} label="Business type" optional />
          <TextInput {...text("employerAddress")} label="Employer address" optional />
        </Grid>
      </Section>

      <Section title="Family">
        <Grid>
          <Choice
            id={id("maritalStatus")}
            label="Marital status"
            options={MARITAL_STATUSES}
            value={info.maritalStatus}
            onChange={(maritalStatus) => set({ maritalStatus })}
          />
          <TextInput {...text("dependants")} label="Number of dependants" inputMode="numeric" hint="Enter 0 if none." />
        </Grid>
        {hasSpouse && !spouseIsCoApplicant && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-3 text-[13px] font-medium text-slate-700">Spouse</p>
            <Grid cols={3}>
              <TextInput {...text("spouseFirstName")} label="First name" />
              <TextInput {...text("spouseLastName")} label="Last name" />
              <TextInput {...text("spouseIncome")} label="Income" inputMode="decimal" />
              <TextInput {...text("spouseEmployer")} label="Employer" optional />
              <TextInput {...text("spouseOccupation")} label="Occupation" optional />
            </Grid>
          </div>
        )}
        {hasSpouse && spouseIsCoApplicant && holder === "A" && (
          <p className="mt-4 text-[13px] text-slate-500">
            The spouse is the joint account holder, so their details are taken on the joint holder&apos;s screen.
          </p>
        )}
      </Section>
    </div>
  );
}
