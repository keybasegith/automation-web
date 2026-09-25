"use client";

/**
 * Sections A and B — the account holder blocks. Client B's block is Client A's
 * with three printed differences: no entity types, a Relationship to Client A
 * line, and an "Address same as Account Holder" box.
 */

import {
  CITIZENSHIPS,
  ENTITY_TYPES,
  GENDERS,
  ID_METHODS,
  MARITAL_STATUSES,
  PEP_ASSOCIATE_QUESTION,
  PEP_FOLLOW_UP,
  PEP_QUESTION,
  PERSON_TITLES,
  RELATIONSHIPS_TO_A,
  SIDE_NOTES,
  TAX_RESIDENCE_NOTICE,
  type HolderType,
  type IdMethod,
} from "@/lib/naaf/config";
import { fieldIds, isEntity } from "@/lib/naaf/completeness";
import type { HolderInfo } from "@/lib/naaf/types";

import {
  CaptionField,
  LineField,
  SideRow,
  TickBox,
  TickGroup,
  YesNoBoxes,
  issueRing,
  useIssue,
} from "./ui";

export default function HolderSection({
  holder,
  info,
  onChange,
}: {
  holder: "A" | "B";
  info: HolderInfo;
  onChange: (patch: Partial<HolderInfo>) => void;
}) {
  const id = (field: keyof HolderInfo) => fieldIds.holder(holder, field);
  const text = (field: keyof HolderInfo) => ({
    id: id(field),
    value: info[field] as string,
    onChange: (value: string) => onChange({ [field]: value }),
  });

  const isA = holder === "A";
  const entity = isA && isEntity(info.holderType);
  const typeOptions: readonly HolderType[] = isA ? [...PERSON_TITLES, ...ENTITY_TYPES] : PERSON_TITLES;
  const typeIssue = useIssue(id("holderType"));
  const genderIssue = useIssue(id("gender"));
  const phoneIssue = useIssue(id("homePhone"));

  const genderBoxes = (
      <span
        id={id("gender")}
        className={`inline-flex scroll-mt-28 items-center gap-2 text-[#0000E0] ${issueRing(genderIssue)}`}
        role="group"
        aria-label="Gender"
      >
        [
        {GENDERS.map((g, i) => (
          <span key={g} className="inline-flex items-center gap-2">
            <TickBox
              checked={info.gender === g}
              onChange={(checked) => onChange({ gender: checked ? g : null })}
              label={g}
            />
            {i === 0 && "or"}
          </span>
        ))}
        ]
      </span>
  );

  return (
    <div className="divide-y divide-slate-200">
      {/* -------------------------------------------------- Name & address */}
      <SideRow
        heading={isA ? <>Primary Account<br className="hidden @2xl:block" /> Holder Information</> : <>Joint Account<br className="hidden @2xl:block" /> Holder Information</>}
        note={
          isA ? (
            <>
              {SIDE_NOTES.corporations[0]} {SIDE_NOTES.corporations[1]}{" "}
              <b>{SIDE_NOTES.corporations[2]}</b> {SIDE_NOTES.corporations[3]}
            </>
          ) : (
            <>
              <span className="font-sans">{SIDE_NOTES.jointHolders}</span>
              <span className="mt-3 block">
                <TickBox
                  id={id("addressSameAsA")}
                  checked={info.addressSameAsA}
                  onChange={(addressSameAsA) => onChange({ addressSameAsA })}
                  label="Address same as Account Holder"
                  className="text-[12px] @2xl:flex-row-reverse"
                />
              </span>
            </>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14.5px]">
          <fieldset id={id("holderType")} className={`scroll-mt-28 ${issueRing(typeIssue)}`}>
            <legend className="sr-only">Title or account holder type</legend>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {typeOptions.map((option, i) => (
                <span key={option} className="contents">
                  {/* The form sets the gender boxes between the titles and the entity types. */}
                  {isA && i === PERSON_TITLES.length && genderBoxes}
                  <TickBox
                    checked={info.holderType === option}
                    onChange={(checked) => onChange({ holderType: checked ? option : null })}
                    label={option}
                  />
                </span>
              ))}
            </div>
          </fieldset>
          {!isA && genderBoxes}
          {!isA && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#0000E0]">Relationship to Client A:</span>
              <TickGroup
                id={id("relationshipToA")}
                legend="Relationship to Client A"
                options={RELATIONSHIPS_TO_A}
                value={info.relationshipToA}
                onChange={(relationshipToA) => onChange({ relationshipToA })}
              />
              <LineField
                {...text("relationshipOther")}
                label="Other relationship"
                srLabel
                className="w-36"
              />
            </div>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 @xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          <CaptionField
            {...text("surname")}
            caption={isA ? "Surname  (Corporation/Organization name)" : "Surname"}
            className="col-span-2 @xl:col-span-1"
          />
          <CaptionField {...text("firstName")} caption="First Name" />
          <CaptionField {...text("initials")} caption="Initials" />
          <CaptionField {...text("sin")} caption="SIN/TIN/BN/TN" />
          <CaptionField
            {...text("dob")}
            caption={
              entity ? (
                "Nature of Business"
              ) : (
                <>
                  D.O.B. <span className="text-[11px]">mm/dd/yy</span>
                </>
              )
            }
            placeholder={entity ? "" : "mm/dd/yy"}
          />
        </div>

        <div
          className={`mt-2 grid grid-cols-2 gap-x-4 gap-y-2 @xl:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] ${
            info.addressSameAsA ? "opacity-50" : ""
          }`}
        >
          <CaptionField {...text("address")} caption="Address" className="col-span-2 @xl:col-span-1" />
          <CaptionField {...text("apt")} caption="Apt." />
          <CaptionField {...text("city")} caption="City" />
          <CaptionField {...text("province")} caption="Prov." />
          <CaptionField {...text("postalCode")} caption="Postal Code" />
        </div>

        <div
          id={`${id("homePhone")}-group`}
          className={`mt-2 grid grid-cols-2 gap-x-4 gap-y-2 @xl:grid-cols-[1fr_1fr_1fr_2.4fr] ${issueRing(phoneIssue)}`}
        >
          <CaptionField {...text("homePhone")} caption="Home Phone No." inputMode="tel" />
          <CaptionField {...text("businessPhone")} caption="Business Phone No." inputMode="tel" />
          <CaptionField {...text("cellPhone")} caption="Cell Phone No." inputMode="tel" />
          <CaptionField {...text("email")} caption="E-Mail Address(es)" inputMode="email" className="col-span-2 @xl:col-span-1" />
        </div>
      </SideRow>

      {/* -------------------------------------------------- Identification */}
      <SideRow heading="Identification" note={SIDE_NOTES.identification.join(" ")}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px]">
          <span className="font-bold text-[#0000E0]">ID Verification Method:</span>
          <TickGroup<IdMethod>
            id={id("idMethod")}
            legend="ID Verification Method"
            options={ID_METHODS.map((m) => m.value)}
            labels={Object.fromEntries(ID_METHODS.map((m) => [m.value, m.label]))}
            value={info.idMethod}
            onChange={(idMethod) => onChange({ idMethod })}
          />
        </div>
        <div className="mt-1.5 grid gap-x-5 gap-y-1.5 @xl:grid-cols-[1fr_1.4fr_1fr]">
          <LineField {...text("idType")} label="ID Type:" />
          <LineField {...text("documentId")} label="Document ID #:" />
          <LineField {...text("dateOfIssue")} label="Date of Issue:" type="date" />
        </div>
        <div className="mt-1.5 grid gap-x-5 gap-y-1.5 @xl:grid-cols-[1fr_1fr_1fr_1fr]">
          <LineField {...text("placeOfIssue")} label="Place of Issue:" />
          <LineField {...text("jurisdiction")} label="Jurisdiction:" />
          <LineField {...text("issuingCountry")} label="Issuing Country:" />
          <LineField {...text("dateOfExpiry")} label="Date of Expiry:" type="date" />
        </div>

        <p className="mt-3 text-[15px] font-bold leading-snug text-[#0000E0]">{TAX_RESIDENCE_NOTICE}</p>
        <QuestionLine
          id={id("pep")}
          question={PEP_QUESTION}
          value={info.pep}
          onChange={(pep) => onChange({ pep })}
        />
        <QuestionLine
          id={id("pepAssociate")}
          question={isA ? PEP_ASSOCIATE_QUESTION : PEP_ASSOCIATE_QUESTION.replace("member or", "member, or")}
          value={info.pepAssociate}
          onChange={(pepAssociate) => onChange({ pepAssociate })}
        />
      </SideRow>

      {/* -------------------------------------------------- Citizenship */}
      <SideRow heading="Citizenship">
        <div className="flex flex-wrap items-end gap-3 text-[15px]">
          <TickGroup
            id={id("citizenship")}
            legend="Citizenship"
            options={CITIZENSHIPS}
            labels={{ Other: "Other:" }}
            value={info.citizenship}
            onChange={(citizenship) => onChange({ citizenship })}
          />
          <LineField {...text("citizenshipOther")} label="Other citizenship" srLabel className="w-full max-w-sm" />
        </div>
      </SideRow>

      {/* -------------------------------------------------- Employment */}
      <SideRow heading="Employment">
        <div className="grid gap-x-6 gap-y-2 @xl:grid-cols-[1.5fr_1fr]">
          <LineField {...text("employer")} label="Employer:" />
          <LineField {...text("businessType")} label="Business Type:" />
          <LineField {...text("employerAddress")} label="Employer Address:" />
          <LineField {...text("occupation")} label="Occupation:" />
        </div>
      </SideRow>

      {/* -------------------------------------------------- Marital status */}
      <SideRow
        heading="Marital Status"
        note={
          <>
            If your spouse is <b>not</b> the Joint Applicant, please complete this section
          </>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 text-[15px]">
          <TickGroup
            id={id("maritalStatus")}
            legend="Marital Status"
            options={MARITAL_STATUSES}
            value={info.maritalStatus}
            onChange={(maritalStatus) => onChange({ maritalStatus })}
          />
          <LineField
            {...text("dependants")}
            label={<b>{isA ? "Number of Dependants:" : "Number of Dependents:"}</b>}
            inputMode="numeric"
            className="w-64"
          />
        </div>
        <div className="mt-2 grid gap-x-5 gap-y-2 @xl:grid-cols-3">
          <LineField {...text("spouseLastName")} label="Spouse’s Last Name:" />
          <LineField {...text("spouseFirstName")} label="Spouse’s First Name:" />
          <LineField {...text("spouseIncome")} label="Spouse’s Income:" inputMode="decimal" />
          <LineField {...text("spouseEmployer")} label="Spouse’s Employer:" />
          <LineField {...text("spouseOccupation")} label="Spouse’s Occupation:" />
        </div>
      </SideRow>
    </div>
  );

}

function QuestionLine({
  id,
  question,
  value,
  onChange,
}: {
  id: string;
  question: string;
  value: "Yes" | "No" | null;
  onChange: (value: "Yes" | "No" | null) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 text-[15px]">
      <span className="text-[#0000E0]">{question}</span>
      <span className="flex items-center gap-2">
        <YesNoBoxes id={id} legend={question} value={value} onChange={onChange} />
        <span className="text-[12.5px] text-[#0000E0]">{PEP_FOLLOW_UP}</span>
      </span>
    </div>
  );
}
