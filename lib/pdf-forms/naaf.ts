/**
 * Fills the official New Account Application Form (public/form-NAAF.pdf,
 * revision V3-NAAF-2022: 4 pages, 365 AcroForm fields) from a digital NaafState.
 *
 * HOW THE MAPPING WAS ESTABLISHED
 *   The field names are cryptic and the on-values of multi-widget boxes do not
 *   follow the printed order (`nKnowledge` runs 3,2,1,0 top to bottom;
 *   `1PTypeExtended` uses 1, 301, 22, 3, 11 …; `nMaritalStatus` puts 6 on
 *   "Separated"). Every entry below was read off the widget's page and
 *   rectangle against the printed label beside it — page 1 and 3 from the text
 *   layer, page 2 (whose text layer is garbled) from the rendered page — and
 *   then confirmed by filling a synthetic form and looking at the rendered
 *   result. Targets are "field" or "field=onValue" (see ./acroform.ts).
 *
 * STATE VALUES WITH NO PLACE OF THEIR OWN ON THE PDF
 *   - hasJointHolder: the paper form has no such box. It is used here only to
 *     decide whether Section B and the Client B KYC column are written at all,
 *     so stale Client B data is never printed on a single-holder form.
 *   - clientA/B.initials: there is no Initials field; the First Name field's
 *     box runs under both "First Name" and "Initials", so the initials are
 *     written into it, padded to start under the "Initials" label.
 *   - clientA/B.apt: likewise no Apt. field; written into the Address box
 *     under the printed "Apt." label.
 *   - clientB.holderType when it is an entity type: Client B's row prints
 *     titles only (config.ts), so an entity type there is not written.
 *   - plans[i].planIdType is one value; the PDF has two boxes under
 *     "Plan ID & Plan Type" (`1PlanID`, `1PTypeStr`). It goes into `nPlanID`;
 *     `nPTypeStr` is left blank rather than guessing how to split it.
 *   - plans[i].intendedUseOther: one text line serves both the Current and New
 *     "Other" boxes, as printed.
 *
 * PDF FIELDS LEFT UNUSED
 *   - txtPrintDate (read-only print stamp), sigSenderInitials (back-office).
 *   - 1PTypeStr / 2PTypeStr / 3PTypeStr (see planIdType above).
 *   - sigClient1_2, sigClient2_2, sigAdvisor1_1 stay empty as text: the
 *     signature IMAGE is drawn into their rectangle instead.
 */

import { PERSON_TITLES, type AccountType, type HolderType } from "../naaf/config";
import { blankHolder, blankKyc } from "../naaf/blank";
import { netWorth, parseMoney } from "../naaf/completeness";
import type { HolderInfo, InvestmentPlan, KycColumn, NaafState, YesNo } from "../naaf/types";
import { AcroFormFiller, check, choice, text, type Binding } from "./acroform";
import type { FillOptions } from "./types";

type B = Binding<NaafState>;

/** Money boxes carry an AFNumber_Format script; keep /V a plain number it can parse. */
const money = (value: string): string => {
  const n = parseMoney(value);
  return n === null ? value : String(n);
};

const yesNo = (yes: string, no: string): Readonly<Record<YesNo, string>> => ({ Yes: yes, No: no });

// ---------------------------------------------------------------- header, A, B (page 1)

const HEADER: B[] = [
  // "New Client  KYC Update  Existing Client (New Plan)" under the title.
  choice((s) => s.formType, {
    "New Client": "chknewzz0",
    "KYC Update": "chknewzz1",
    "Existing Client (New Plan)": "chknewzz2",
  }),
  text("CCode", (s) => s.clientId), // "Client ID:" box in the Section A header bar
];

/** Printed x of the "Initials" / "Apt." labels (PDF points) — same on A's and B's rows. */
const INITIALS_X = 393;
const APT_X = 284;

const apt = (value: string): string =>
  !value.trim() || /^(apt|unit|suite|#)/i.test(value.trim()) ? value : `Apt. ${value.trim()}`;

/** Field names of one holder block; A and B are laid out identically but named differently. */
interface HolderFields {
  surname: string;
  firstName: string;
  sin: string;
  dob: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  homePhone: string;
  businessPhone: string;
  cellPhone: string;
  email: string;
  idPhoto: string;
  idDual: string;
  idCredit: string;
  idType: string;
  documentId: string;
  dateOfIssue: string;
  placeOfIssue: string;
  jurisdiction: string;
  issuingCountry: string;
  dateOfExpiry: string;
  pepYes: string;
  pepNo: string;
  pepAssociateYes: string;
  pepAssociateNo: string;
  canadian: string;
  citizenshipOther: string;
  citizenshipOtherText: string;
  employer: string;
  businessType: string;
  employerAddress: string;
  occupation: string;
  marital: Record<HolderInfo["maritalStatus"] & string, string>;
  dependants: string;
  spouseLastName: string;
  spouseFirstName: string;
  spouseIncome: string;
  spouseEmployer: string;
  spouseOccupation: string;
}

const A_FIELDS: HolderFields = {
  surname: "txtLastName", // Surname (Corporation/Organization name)
  firstName: "txtFirstName", // First Name + Initials
  sin: "txtSIN", // SIN/TIN/BN/TN
  dob: "txtDOB", // D.O.B. mm/dd/yy (nature of business for corporations)
  address: "txtAddress", // Address + Apt.
  city: "txtCity",
  province: "txtProvince",
  postalCode: "txtPostalCode",
  homePhone: "txtHPhone",
  businessPhone: "txtBPhone",
  cellPhone: "txtCPhone",
  email: "txtEmail",
  idPhoto: "zchkid_a.0", // ID Verification Method: Photo ID
  idDual: "zchkid_a.1", // Dual Source
  idCredit: "IdMethod_Flags32", // Credit Check
  idType: "txtIDType1",
  documentId: "txtID1",
  dateOfIssue: "txtIDDate1",
  placeOfIssue: "txtIDPlace1",
  jurisdiction: "txtIDProvince1",
  issuingCountry: "txtIDCountry1",
  dateOfExpiry: "txtIDExpiry1",
  pepYes: "nPEPHIOType0", // "…Politically Exposed Person, or a HIO?" Yes
  pepNo: "pep_no",
  pepAssociateYes: "PEP_FamilyMember_Flag2", // "…family member or a close associate…" Yes
  pepAssociateNo: "pep_dom_hio_no",
  canadian: "citizenshipchk",
  citizenshipOther: "zcitother.0",
  citizenshipOtherText: "citizenship",
  employer: "txtEmployerName",
  businessType: "txtTypeOfBusiness",
  employerAddress: "txtEmployerAddress",
  occupation: "txtEmpPosition",
  // One field, six widgets; on-values do not follow the printed order.
  marital: {
    Single: "nMaritalStatus=1",
    Married: "nMaritalStatus=2",
    Separated: "nMaritalStatus=6",
    Divorced: "nMaritalStatus=3",
    Widowed: "nMaritalStatus=4",
    "Common Law": "nMaritalStatus=5",
  },
  dependants: "txtDependants",
  spouseLastName: "txtSpouseLName",
  spouseFirstName: "txtSpouseFName",
  spouseIncome: "zzspouse_income",
  spouseEmployer: "zspouse_emp",
  spouseOccupation: "txtSpouseOccupation",
};

const B_FIELDS: HolderFields = {
  surname: "11Joint_Surname",
  firstName: "11Joint_Name",
  sin: "11Joint_SIN",
  dob: "11Joint_DOB",
  address: "11Joint_Address",
  city: "11Joint_City",
  province: "11Joint_Province",
  postalCode: "11Joint_PostalCode",
  homePhone: "11JointHPhone",
  businessPhone: "11JointBPhone",
  cellPhone: "11JointCPhone",
  email: "11JointEmail",
  idPhoto: "zchkid_b.0",
  idDual: "zchkid_b.1",
  idCredit: "zchkid_b.2",
  idType: "11JointClientIDType",
  documentId: "11JointClientID1",
  dateOfIssue: "11JointClientIDDate1",
  placeOfIssue: "11JointClientIDPlace1",
  jurisdiction: "11JointClientIDProvince1",
  issuingCountry: "11JointClientIDCountry",
  dateOfExpiry: "11JointClientIDExpiry1",
  pepYes: "jt_pep_yes",
  pepNo: "jt_pep_no",
  pepAssociateYes: "jt_pep_dom_hio_yes",
  pepAssociateNo: "jt_pep_dom_hio_no",
  canadian: "11jt_citizenshipchk",
  citizenshipOther: "zcitother.1",
  citizenshipOtherText: "11JointCitizenship",
  employer: "11JointEmployerName",
  businessType: "11EmployerBusinessType",
  employerAddress: "11JointEmployerAddress2",
  occupation: "11jt_emp_occupation",
  // Client B's statuses are six separate boxes.
  marital: {
    Single: "11jt_marital_status_sin",
    Married: "11jt_marital_status_mar",
    Separated: "11jt_marital_status_sep",
    Divorced: "11jt_marital_status_div",
    Widowed: "11jt_marital_status_wid",
    "Common Law": "11jt_marital_status_com",
  },
  dependants: "11JointDependents",
  spouseLastName: "11jt_spouse_last",
  spouseFirstName: "11jt_spouse_first",
  spouseIncome: "zzjt_spouse_income",
  spouseEmployer: "zspouse_empjjj",
  spouseOccupation: "11jt_spouse_occupation",
};

/** Mr./Mrs./Miss/Ms./Dr./Prof. are one field whose on-values 0..5 run left to right. */
const titles = (field: string): Record<(typeof PERSON_TITLES)[number], string> => ({
  "Mr.": `${field}=0`,
  "Mrs.": `${field}=1`,
  Miss: `${field}=2`,
  "Ms.": `${field}=3`,
  "Dr.": `${field}=4`,
  "Prof.": `${field}=5`,
});

/** Client A's row: titles, then Entity / Estate / Trust… / Gov't boxes further right. */
const A_HOLDER_TYPES: Record<HolderType, string> = {
  ...titles("nTitle"),
  Entity: "corp",
  Estate: "chkexzz0",
  "Trust, Club, Assoc., Partnership": "chkexzz1",
  "Gov't": "zchkGov",
};

const holderBindings = (pick: (s: NaafState) => HolderInfo, f: HolderFields): B[] => [
  text(f.surname, (s) => pick(s).surname),
  {
    kind: "pair",
    field: f.firstName,
    get: (s) => [pick(s).firstName, pick(s).initials],
    secondAtX: INITIALS_X,
  },
  text(f.sin, (s) => pick(s).sin),
  text(f.dob, (s) => pick(s).dob),
  { kind: "pair", field: f.address, get: (s) => [pick(s).address, apt(pick(s).apt)], secondAtX: APT_X },
  text(f.city, (s) => pick(s).city),
  text(f.province, (s) => pick(s).province),
  text(f.postalCode, (s) => pick(s).postalCode),
  text(f.homePhone, (s) => pick(s).homePhone),
  text(f.businessPhone, (s) => pick(s).businessPhone),
  text(f.cellPhone, (s) => pick(s).cellPhone),
  text(f.email, (s) => pick(s).email),

  choice((s) => pick(s).idMethod, { photo: f.idPhoto, dual: f.idDual, credit: f.idCredit }),
  text(f.idType, (s) => pick(s).idType),
  text(f.documentId, (s) => pick(s).documentId),
  text(f.dateOfIssue, (s) => pick(s).dateOfIssue),
  text(f.placeOfIssue, (s) => pick(s).placeOfIssue),
  text(f.jurisdiction, (s) => pick(s).jurisdiction),
  text(f.issuingCountry, (s) => pick(s).issuingCountry),
  text(f.dateOfExpiry, (s) => pick(s).dateOfExpiry),

  choice((s) => pick(s).pep, yesNo(f.pepYes, f.pepNo)),
  choice((s) => pick(s).pepAssociate, yesNo(f.pepAssociateYes, f.pepAssociateNo)),

  choice((s) => pick(s).citizenship, { Canadian: f.canadian, Other: f.citizenshipOther }),
  text(f.citizenshipOtherText, (s) => (pick(s).citizenship === "Other" ? pick(s).citizenshipOther : "")),

  text(f.employer, (s) => pick(s).employer),
  text(f.businessType, (s) => pick(s).businessType),
  text(f.employerAddress, (s) => pick(s).employerAddress),
  text(f.occupation, (s) => pick(s).occupation),

  choice((s) => pick(s).maritalStatus, f.marital),
  text(f.dependants, (s) => pick(s).dependants),
  text(f.spouseLastName, (s) => pick(s).spouseLastName),
  text(f.spouseFirstName, (s) => pick(s).spouseFirstName),
  text(f.spouseIncome, (s) => money(pick(s).spouseIncome)),
  text(f.spouseEmployer, (s) => pick(s).spouseEmployer),
  text(f.spouseOccupation, (s) => pick(s).spouseOccupation),
];

const SECTION_A: B[] = [
  choice((s) => s.clientA.holderType, A_HOLDER_TYPES),
  choice((s) => s.clientA.gender, { Male: "nSex=0", Female: "nSex=1" }), // [Male or Female]
  ...holderBindings((s) => s.clientA, A_FIELDS),
];

const SECTION_B: B[] = [
  choice(
    (s) => {
      const t = s.clientB.holderType;
      return t && (PERSON_TITLES as readonly string[]).includes(t) ? (t as (typeof PERSON_TITLES)[number]) : null;
    },
    titles("11JointTitle"),
  ),
  choice((s) => s.clientB.gender, { Male: "11JointSex=0", Female: "11JointSex=1" }),
  // "Relationship to Client A:  Spouse  Other ____"
  choice((s) => s.clientB.relationshipToA, { Spouse: "zrelatw1.2", Other: "zrelatw1.3" }),
  text("zrelateother", (s) => (s.clientB.relationshipToA === "Other" ? s.clientB.relationshipOther : "")),
  check("chkpage1_1", (s) => s.clientB.addressSameAsA), // "Address same as Account Holder" (left margin)
  ...holderBindings((s) => s.clientB, B_FIELDS),
];

// ---------------------------------------------------------------- C. Client KYC (page 1)

interface KycFields {
  income: string;
  liquid: string;
  fixed: string;
  liabilities: string;
  netWorth: string;
  knowledge: string;
  experience: Record<KycColumn["experience"][number], string>;
}

const kycFields = (jt: boolean): KycFields => ({
  // Eight income widgets, on-values 0..7 top to bottom ("Under $25,000" … "$1 Million and Over").
  income: jt ? "11JointPersonalIncome" : "nIncome",
  liquid: jt ? "11JointLiquidAssets" : "txtLiquidAsset",
  fixed: jt ? "11JointTotalAssets" : "txtAsset", // "Fixed Assets" row despite the name
  liabilities: jt ? "11JointTotalLiabilities" : "txtLiability",
  netWorth: jt ? "11JointNetAssets" : "txtTotalAsset", // "Net Worth" row
  // Four widgets whose on-values run 3,2,1,0 top to bottom.
  knowledge: jt ? "11JointInvestmentKnowledge" : "nKnowledge",
  experience: {
    Bonds: jt ? "11JointBond" : "nBond",
    Mortgages: jt ? "11JointMortgage" : "nMortgage",
    Stocks: jt ? "11JointStock" : "nStock",
    "Mutual Funds": jt ? "11JointMF" : "nMF",
    "Term Deposit": jt ? "11JointGIC" : "nGIC",
    "Real Estate": jt ? "11JointRealEstate" : "nRealEstate",
    None: jt ? "oiv7_jt" : "oiv7",
  },
});

const kycBindings = (col: "A" | "B"): B[] => {
  const f = kycFields(col === "B");
  const k = (s: NaafState) => s.kyc[col];
  return [
    choice((s) => k(s).income, {
      "Under $25,000": `${f.income}=0`,
      "$25,000 - $49,999": `${f.income}=1`,
      "$50,000 - $74,999": `${f.income}=2`,
      "$75,000 - $99,999": `${f.income}=3`,
      "$100,000 - $124,999": `${f.income}=4`,
      "$125,000 - $199,999": `${f.income}=5`,
      "$200,000 - $999,999": `${f.income}=6`,
      "$1 Million and Over": `${f.income}=7`,
    }),
    // Right-aligned: Client B's boxes start on top of the printed "$".
    text(f.liquid, (s) => money(k(s).netWorth.liquidAssets), "right"),
    text(f.fixed, (s) => money(k(s).netWorth.fixedAssets), "right"),
    text(f.liabilities, (s) => money(k(s).netWorth.liabilities), "right"),
    // "Fixed Assets + Liquid Assets – Liabilities", via the digital form's own helper.
    text(f.netWorth, (s) => netWorth(k(s)), "right"),
    choice((s) => k(s).knowledge, {
      Novice: `${f.knowledge}=3`,
      Fair: `${f.knowledge}=2`,
      Good: `${f.knowledge}=1`,
      Sophisticated: `${f.knowledge}=0`,
    }),
    ...Object.entries(f.experience).map(([type, field]) =>
      check<NaafState>(field, (s) => (k(s).experience as string[]).includes(type)),
    ),
  ];
};

const SECTION_C_SHARED: B[] = [
  check("SpousalNetWorthIncluded", (s) => s.kyc.netWorthIncludesSpouse), // "Net Worth includes Spouse's Net Worth"
];

// ---------------------------------------------------------------- D/E/F. Investment plans (page 2)

/**
 * Plans D, E, F repeat one layout. Names follow three conventions: a numeric
 * prefix ("1PlanID", "2PlanID"), a letter suffix ("zallsign.0", "zallsign.0_b",
 * "zallsign.0_c"), and — for "Corporate" only — "corp_a/_b/_c". The risk
 * tolerance New column is "zper_l" on plan 1 but "2zper_l" / "3zper_l" after.
 */
const planBindings = (i: number): B[] => {
  const n = i + 1;
  const sfx = ["", "_b", "_c"][i];
  const zper = ["", "2", "3"][i];
  const p = (s: NaafState): InvestmentPlan => s.plans[i];

  // "Type>" rows. Registered types share one field; the rest are separate boxes.
  const accountTypes: Record<AccountType, string> = {
    RRSP: `${n}PTypeExtended=1`,
    SpRRSP: `${n}PTypeExtended=301`,
    FHSA: `${n}PTypeExtended=22`,
    "RESP-Indiv": `${n}PTypeExtended=3`,
    "RESP-Fam": `${n}PTypeExtended=11`,
    LIRA: `${n}PTypeExtended=7`,
    RRIF: `${n}PTypeExtended=2`,
    SpRRIF: `${n}PTypeExtended=302`,
    LIF: `${n}PTypeExtended=6`,
    RDSP: `${n}PTypeExtended=18`,
    TFSA: `${n}PTypeExtended=17`,
    "Group RSP": `${n}PTypeExtended=101`,
    "Open Indiv.": `${n}PTypeExtended=0`, // Non-Registered row, first box
    ITF: `${n}InTrust_Title`,
    JTITF: `jtwif${sfx}`,
    Corporate: `corp_${"abc"[i]}`,
    Other: `zzzoth${sfx}`,
    "Open JTWROS": `${n}Joint_Flag=0`, // Joint row
    "Open JTTIC": `${n}Joint_Flag=1`,
    "JT RESP-Indiv": `jt_resp${sfx}`,
    "JT RESP-Fam": `jt_resp_fam${sfx}`,
  };

  const objectives = (col: "current" | "new") => {
    const name = (cur: string, nu: string) =>
      col === "current" ? `${n}PInvestObject_${cur}_Per` : `${n}zoi_${nu}_pec`;
    return [
      text(name("Safety", "saf"), (s: NaafState) => p(s).objectives[col].Safety),
      text(name("Income", "inc"), (s: NaafState) => p(s).objectives[col].Income),
      text(name("Balanced", "bal"), (s: NaafState) => p(s).objectives[col].Balanced),
      text(name("Growth", "gro"), (s: NaafState) => p(s).objectives[col].Growth),
      text(name("AggressGrowth", "agg"), (s: NaafState) => p(s).objectives[col].Speculation),
    ];
  };

  const risk = (col: "current" | "new") => {
    const name = (cur: string, nu: string) =>
      col === "current" ? `${n}PRiskTolerence_${cur}_Per` : `${zper}zper_${nu}`;
    return [
      text(name("Low", "l"), (s: NaafState) => p(s).riskTolerance[col].Low),
      text(name("LM", "lm"), (s: NaafState) => p(s).riskTolerance[col]["Low to Medium"]),
      text(name("Medium", "m"), (s: NaafState) => p(s).riskTolerance[col].Medium),
      text(name("MH", "mh"), (s: NaafState) => p(s).riskTolerance[col]["Medium to High"]),
      text(name("High", "h"), (s: NaafState) => p(s).riskTolerance[col].High),
    ];
  };

  // Time Horizon: Current is one field (on-values 0..5 top to bottom), New is six boxes.
  const horizon = (col: "current" | "new") =>
    choice((s: NaafState) => p(s).timeHorizon[col], {
      "Less than 1 Year": col === "current" ? `${n}PLiquidity=0` : `zli1${sfx}`,
      "1 - 3 Years": col === "current" ? `${n}PLiquidity=1` : `zli2${sfx}`,
      "3 - 5 Years": col === "current" ? `${n}PLiquidity=2` : `zli3${sfx}`,
      "5 - 10 Years": col === "current" ? `${n}PLiquidity=3` : `zli4${sfx}`,
      "10 - 20 Years": col === "current" ? `${n}PLiquidity=4` : `zli5${sfx}`,
      "Over 20 Years": col === "current" ? `${n}PLiquidity=5` : `zli6${sfx}`,
    });

  // Intended Use: tick-all-that-apply. New column's names are not in printed order.
  const uses = (col: "current" | "new") => {
    const boxes: Record<InvestmentPlan["intendedUse"]["current"][number], string> =
      col === "current"
        ? {
            "Tax Savings": `${n}nPIOTaxSaving`,
            "Child Education": `${n}nPIOChildEducation`,
            Savings: `${n}nPIOSavings`,
            "Retirement Planning": `${n}nPIORetirement`,
            "Other: Please Specify": `${n}if3othchk`,
          }
        : {
            "Tax Savings": `zif31${sfx}`,
            "Child Education": `zif33${sfx}`,
            Savings: `zif35${sfx}`,
            "Retirement Planning": `zif32${sfx}`,
            "Other: Please Specify": `zif3othchk${sfx}`,
          };
    return Object.entries(boxes).map(([use, target]) =>
      check(target, (s: NaafState) => (p(s).intendedUse[col] as string[]).includes(use)),
    );
  };

  return [
    text(`${n}PlanID`, (s) => p(s).planIdType), // "Plan ID & Plan Type:" (first of two boxes)
    choice((s) => p(s).owner, { A: `zClientA.0${sfx}`, B: `zClientA.1${sfx}` }), // "Client A or Client B"
    // "Registration: Client Name / Keybase Nominee / Intermediary (Name & Account #):"
    choice((s) => p(s).registration, {
      client: `${n}Account_Designation=0`,
      nominee: `${n}Account_Designation=1`,
      intermediary: `${n}Account_Designation=2`,
    }),
    text(`${n}Intermediary_Account_Code`, (s) => (p(s).registration === "intermediary" ? p(s).intermediary : "")),
    choice((s) => p(s).accountType, accountTypes),
    text(`zzztxtother${sfx}`, (s) => (p(s).accountType === "Other" ? p(s).accountTypeOther : "")), // "Other:" line
    choice((s) => p(s).signingAuthority, {
      "All owners to sign": `zallsign.0${sfx}`,
      "Any one owner to sign": `zallsign.1${sfx}`,
    }),
    // "Leverage: Did you borrow money to invest in this account?  Yes  No  Lending Institution:"
    choice((s) => p(s).leverage, yesNo(`${n}nLeverage=1`, `${n}nLeverage=0`)),
    text(`lending_institution.0${sfx}`, (s) => (p(s).leverage === "Yes" ? p(s).lendingInstitution : "")),
    ...objectives("current"),
    ...objectives("new"),
    ...risk("current"),
    ...risk("new"),
    horizon("current"),
    horizon("new"),
    ...uses("current"),
    ...uses("new"),
    text(`${n}if3oth`, (s) => p(s).intendedUseOther), // line under "Other: Please Specify"
    // Beneficiary/ITF Name · S.I.N. · D.O.B. · Primary Beneficiary · Allocation % · Relationship
    text(`${n}_1BeneFLName`, (s) => p(s).beneficiary.name),
    text(`${n}_1BenetxtSIN`, (s) => p(s).beneficiary.sin),
    text(`${n}_1BeneDOB`, (s) => p(s).beneficiary.dob),
    check(`zpriben${sfx}`, (s) => p(s).beneficiary.primary),
    text(`${n}_1BeneAlloc`, (s) => p(s).beneficiary.allocation),
    text(`${n}_1BeneRelationship`, (s) => p(s).beneficiary.relationship),
    // G. "Will anyone, other than the applicant:" — one YES/No pair per plan column.
    choice((s) => p(s).thirdParty.financialInterest, yesNo(`${n}nQ1=1`, `${n}nQ1=0`)),
    choice((s) => p(s).thirdParty.tradingAuthorization, yesNo(`${n}nQ2=1`, `${n}nQ2=0`)),
    choice((s) => p(s).thirdParty.makingDeposits, yesNo(`z${n}nQ2=1`, `z${n}nQ2=0`)),
  ];
};

// ---------------------------------------------------------------- G (corporations), H (page 2)

const SECTION_G_CORP: B[] = [
  // Field numbering does not follow the printed rows: Flag2 is the top row.
  choice((s) => s.corporation.registeredCharity, yesNo("Charity_Flag2=2", "Charity_Flag2=1")),
  choice((s) => s.corporation.notForProfit, yesNo("Charity_Flag1=2", "Charity_Flag1=1")),
  choice((s) => s.corporation.solicitsDonations, yesNo("Charity_Flag3=2", "Charity_Flag3=1")),
];

const SECTION_H: B[] = [
  check("zvoidchque", (s) => s.banking.voidChequeOnFile),
  choice((s) => s.banking.owner, { Personal: "nBankType=0", Business: "nBankType=1" }),
  choice((s) => s.banking.accountType, {
    Chequing: "txtBankAccountType=0",
    Savings: "txtBankAccountType=1",
    Other: "txtBankAccountType=3",
  }),
  text("txtBankName", (s) => s.banking.bankName),
  text("txtBranchCode", (s) => s.banking.transit), // "Transit #"
  text("txtBankCode", (s) => s.banking.bankNumber), // "Bank #"
  text("txtBankAccountNumber", (s) => s.banking.accountNumber),
];

// ---------------------------------------------------------------- I–N (page 3)

const SECTIONS_I_TO_N: B[] = [
  text("1TrustedContactPersonLastName", (s) => s.tcp.surname),
  text("1TrustedContactPersonFirstName", (s) => s.tcp.firstName),
  text("1TrustedContactPersonCellPhone", (s) => s.tcp.phone), // "Phone Number"
  text("1TrustedContactPersonEmail", (s) => s.tcp.email),
  text("1TrustedContactPersonRelationshipStr", (s) => s.tcp.relationship),
  check("zchkPage40", (s) => s.caslConsent), // J. CASL consent box
  check("zchkPage410", (s) => s.eddConsent), // K. EDD consent box
  check("zchkPage411", (s) => s.oba.notApplicable), // L. "Not Applicable" in the section bar
  { kind: "multiline", field: "oba", get: (s) => s.oba.description }, // L. products/services box
  text("sigClient1_1", (s) => s.oba.primaryInitials), // L. "Primary Account Holder's Initials"
  text("sigClient2_1", (s) => s.oba.jointInitials), // L. "Joint Account Holder's Initials"
  // M. Client Signature rows: signature images are drawn separately; dates here.
  text("txtDealerCode", (s) => s.advisor.dealerCode), // N. section bar
  text("txtRepCode", (s) => s.advisor.repCode),
  choice((s) => s.advisor.answers.metInPerson, yesNo("IdMethodInPerson=1", "IdMethodInPerson=0")),
  choice((s) => s.advisor.answers.verifiedId, yesNo("zchkMqustionsa110", "zchkMqustionsb111")),
  choice((s) => s.advisor.answers.providedRdd, yesNo("zchkMqustionsc120", "zchkMqustionsd121")),
  choice((s) => s.advisor.answers.directInterest, yesNo("zchkMqustionse130", "zchkMqustionsf131")),
  text("txtRepNameFL", (s) => s.advisor.name), // "Advisor's Name:"
];

/** Signature boxes: image field, date field, and where the default comes from. */
export const NAAF_SIGNATURES = {
  client1: { image: "sigClient1_2", date: "sigClientDate1_2" }, // M. first "Client Signature:" row
  client2: { image: "sigClient2_2", date: "sigClientDate2_2" }, // M. second row
  advisor: { image: "sigAdvisor1_1", date: "sigAdvisorDate1_1" }, // N. "Signature:" / "Date:"
} as const;

/** The whole NAAF mapping, in printed order. Section B is written only for joint applications. */
export const NAAF_BINDINGS = {
  always: [
    ...HEADER,
    ...SECTION_A,
    ...kycBindings("A"),
    ...SECTION_C_SHARED,
    ...planBindings(0),
    ...planBindings(1),
    ...planBindings(2),
    ...SECTION_G_CORP,
    ...SECTION_H,
    ...SECTIONS_I_TO_N,
  ] as readonly B[],
  joint: [...SECTION_B, ...kycBindings("B")] as readonly B[],
};

export async function fillNaafPdf(
  template: Uint8Array | ArrayBuffer,
  naaf: NaafState,
  options: FillOptions = {},
): Promise<Uint8Array> {
  const filler = await AcroFormFiller.load(template);
  filler.apply(naaf, NAAF_BINDINGS.always);
  // Without a joint holder Section B is written blank — which also clears the
  // template's pre-ticked Client B PEP "No" boxes — whatever stale Client B
  // data the state still holds.
  filler.apply(
    naaf.hasJointHolder ? naaf : { ...naaf, clientB: blankHolder(), kyc: { ...naaf.kyc, B: blankKyc() } },
    NAAF_BINDINGS.joint,
  );

  const fromState = {
    client1: { signature: naaf.clientSignatures[0]?.signature ?? null, date: naaf.clientSignatures[0]?.date ?? "" },
    client2: { signature: naaf.clientSignatures[1]?.signature ?? null, date: naaf.clientSignatures[1]?.date ?? "" },
    advisor: { signature: naaf.advisor.signature, date: naaf.advisor.date },
  };
  for (const role of ["client1", "client2", "advisor"] as const) {
    const box = NAAF_SIGNATURES[role];
    filler.setText(box.date, options.dates?.[role] ?? fromState[role].date);
    const override = options.signatures?.[role];
    const signature = override === undefined ? fromState[role].signature : override;
    if (signature) await filler.drawImage(box.image, signature);
  }

  return filler.save(options.flatten ?? false);
}
