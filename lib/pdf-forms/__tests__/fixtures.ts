/**
 * Fully-populated synthetic forms for the PDF-fill tests. FAKE DATA ONLY —
 * this repository is public. Values are chosen so that each multi-widget
 * group lands on a box whose on-value differs from its printed position.
 */

import { deflateSync } from "node:zlib";

import { blankNaaf } from "../../naaf/blank";
import type { NaafState } from "../../naaf/types";
import { blankQuestionnaire } from "../../risk-questionnaire/blank";
import type { QuestionnaireState } from "../../risk-questionnaire/types";

// ---------------------------------------------------------------- signature PNG

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer): number => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer): Buffer => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

/** A transparent 300×100 PNG with a scribbled stroke, as a data URL. `seed` varies the stroke. */
export function fakeSignaturePng(seed = 1): string {
  const w = 300;
  const h = 100;
  const px = Buffer.alloc(w * h * 4);
  const dot = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const xx = Math.round(x + dx);
        const yy = Math.round(y + dy);
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const i = (yy * w + xx) * 4;
        px[i] = 10;
        px[i + 1] = 20;
        px[i + 2] = 90;
        px[i + 3] = 255;
      }
  };
  for (let t = 0; t <= 1; t += 0.0005) {
    const x = 10 + t * 280;
    const y = 50 + 30 * Math.sin(t * Math.PI * (4 + seed)) * Math.cos(t * 7 * seed) - 10 * Math.sin(t * 30);
    dot(x, y);
  }
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

// ---------------------------------------------------------------- NAAF

export function syntheticNaaf(): NaafState {
  const s = blankNaaf();
  s.formType = "KYC Update";
  s.clientId = "TEST-0042";
  s.hasJointHolder = true;

  Object.assign(s.clientA, {
    holderType: "Dr.",
    gender: "Female",
    surname: "Testperson",
    firstName: "Alexa",
    initials: "Q",
    sin: "000 000 000",
    dob: "01/02/80",
    address: "123 Example Street",
    apt: "4B",
    city: "Sampletown",
    province: "ON",
    postalCode: "A1A 1A1",
    homePhone: "555-010-0001",
    businessPhone: "555-010-0002",
    cellPhone: "555-010-0003",
    email: "alexa@example.com",
    idMethod: "dual",
    idType: "Passport",
    documentId: "X0000001",
    dateOfIssue: "2020-01-01",
    placeOfIssue: "Ottawa",
    jurisdiction: "ON",
    issuingCountry: "Canada",
    dateOfExpiry: "2030-01-01",
    pep: "No",
    pepAssociate: "Yes",
    citizenship: "Other",
    citizenshipOther: "Freedonia",
    employer: "Acme Placeholder Inc.",
    businessType: "Widgets",
    employerAddress: "1 Industrial Way, Sampletown",
    occupation: "Engineer",
    maritalStatus: "Separated",
    dependants: "2",
    spouseLastName: "Otherperson",
    spouseFirstName: "Robin",
    spouseIncome: "$45,000",
    spouseEmployer: "Fictional Co.",
    spouseOccupation: "Designer",
  });

  Object.assign(s.clientB, {
    holderType: "Ms.",
    gender: "Male",
    relationshipToA: "Other",
    relationshipOther: "Sibling",
    addressSameAsA: true,
    surname: "Jointperson",
    firstName: "Sam",
    initials: "T",
    sin: "111 111 111",
    dob: "03/04/85",
    address: "123 Example Street",
    apt: "Unit 9",
    city: "Sampletown",
    province: "ON",
    postalCode: "A1A 1A1",
    homePhone: "555-020-0001",
    businessPhone: "555-020-0002",
    cellPhone: "555-020-0003",
    email: "sam@example.com",
    idMethod: "credit",
    idType: "Driver licence",
    documentId: "D0000002",
    dateOfIssue: "2021-05-05",
    placeOfIssue: "Toronto",
    jurisdiction: "ON",
    issuingCountry: "Canada",
    dateOfExpiry: "2031-05-05",
    pep: "Yes",
    pepAssociate: "No",
    citizenship: "Canadian",
    employer: "Imaginary Ltd.",
    businessType: "Consulting",
    employerAddress: "2 Nowhere Rd",
    occupation: "Analyst",
    maritalStatus: "Widowed",
    dependants: "0",
    spouseLastName: "Nobody",
    spouseFirstName: "Pat",
    spouseIncome: "0",
    spouseEmployer: "Retired",
    spouseOccupation: "None",
  });

  s.kyc.A = {
    income: "$100,000 - $124,999",
    netWorth: { liquidAssets: "250,000", fixedAssets: "$600,000", liabilities: "150000" },
    knowledge: "Good",
    experience: ["Bonds", "Stocks", "Real Estate"],
  };
  s.kyc.B = {
    income: "$25,000 - $49,999",
    netWorth: { liquidAssets: "10000", fixedAssets: "0", liabilities: "2500" },
    knowledge: "Novice",
    experience: ["None"],
  };
  s.kyc.netWorthIncludesSpouse = true;

  const [p1, p2, p3] = s.plans;
  Object.assign(p1, {
    planIdType: "P-001 RRSP",
    owner: "A",
    registration: "nominee",
    accountType: "SpRRIF",
    signingAuthority: null,
    leverage: "Yes",
    lendingInstitution: "Sample Bank",
    timeHorizon: { current: "3 - 5 Years", new: "10 - 20 Years" },
    intendedUse: { current: ["Retirement Planning"], new: ["Savings", "Other: Please Specify"] },
    intendedUseOther: "Cottage fund",
    beneficiary: {
      name: "Casey Testperson",
      sin: "222 222 222",
      dob: "05/06/10",
      primary: true,
      allocation: "100",
      relationship: "Child",
    },
    thirdParty: { financialInterest: "Yes", tradingAuthorization: "No", makingDeposits: "No" },
  });
  p1.objectives.current = { Safety: "10", Income: "20", Balanced: "30", Growth: "40", Speculation: "0" };
  p1.objectives.new = { Safety: "5", Income: "15", Balanced: "25", Growth: "35", Speculation: "20" };
  p1.riskTolerance.current = { Low: "11", "Low to Medium": "22", Medium: "33", "Medium to High": "34", High: "0" };
  p1.riskTolerance.new = { Low: "1", "Low to Medium": "2", Medium: "3", "Medium to High": "4", High: "90" };

  Object.assign(p2, {
    planIdType: "P-002",
    owner: "B",
    registration: "intermediary",
    intermediary: "Broker X #998877",
    accountType: "Other",
    accountTypeOther: "Custom",
    signingAuthority: "Any one owner to sign",
    leverage: "No",
    timeHorizon: { current: "Less than 1 Year", new: "Over 20 Years" },
    intendedUse: { current: ["Tax Savings", "Child Education"], new: ["Child Education"] },
    thirdParty: { financialInterest: "No", tradingAuthorization: "Yes", makingDeposits: "No" },
  });
  p2.objectives.current.Balanced = "100";
  p2.riskTolerance.new.Medium = "100";

  Object.assign(p3, {
    planIdType: "P-003",
    owner: "A",
    registration: "client",
    accountType: "Open JTTIC",
    signingAuthority: "All owners to sign",
    leverage: "No",
    timeHorizon: { current: "5 - 10 Years", new: "1 - 3 Years" },
    intendedUse: { current: ["Savings"], new: ["Tax Savings", "Retirement Planning"] },
    thirdParty: { financialInterest: "No", tradingAuthorization: "No", makingDeposits: "Yes" },
  });
  p3.objectives.new.Growth = "100";
  p3.riskTolerance.current["Low to Medium"] = "100";

  s.corporation = { registeredCharity: "Yes", notForProfit: "No", solicitsDonations: "Yes" };

  s.banking = {
    voidChequeOnFile: true,
    owner: "Business",
    accountType: "Savings",
    bankName: "Example Savings Bank",
    transit: "12345",
    bankNumber: "001",
    accountNumber: "9876543",
  };

  s.tcp = {
    surname: "Contactperson",
    firstName: "Jordan",
    phone: "555-030-0001",
    email: "jordan@example.com",
    relationship: "Friend",
  };
  s.caslConsent = true;
  s.eddConsent = true;
  s.oba = {
    notApplicable: false,
    description: "Insurance products through Placeholder Insurance Agency; tax preparation services.",
    primaryInitials: "AQT",
    jointInitials: "STJ",
  };
  s.clientSignatures = [
    { signature: fakeSignaturePng(1), date: "2026-09-20" },
    { signature: fakeSignaturePng(2), date: "2026-09-21" },
  ];
  s.advisor = {
    dealerCode: "9999",
    repCode: "R123",
    answers: { metInPerson: "Yes", verifiedId: "No", providedRdd: "Yes", directInterest: "No" },
    name: "Morgan Advisorperson",
    signature: fakeSignaturePng(3),
    date: "2026-09-22",
  };
  return s;
}

// ---------------------------------------------------------------- CRQ

/** Capacity 8+8+9+10+10+10 = 55 (High); tolerance 6+4+4+6+6+6 = 32 (Medium) → ranking Medium. */
export function syntheticCrq(): QuestionnaireState {
  const s = blankQuestionnaire();
  s.accountHolderName = "Alexa Testperson";
  s.jointHolderName = "Sam Jointperson";
  s.clientId = "TEST-0042";
  s.portfolioPriorities = { taxSavings: 3, childEducation: null, retirementPlanning: 1, estatePlanning: 4, savings: 2 };
  s.investmentCheckFrequency = "quarterly";
  s.answers = {
    q1: "q1_b",
    q2: "q2_d",
    q3: "q3_g",
    q4: "q4_c",
    q5: "q5_f",
    q6: "q6_e",
    q7: "q7_b",
    q8: "q8_b",
    q9: "q9_b",
    q10: "q10_c",
    q11: "q11_b",
    q12: "q12_c",
  };
  s.notes =
    "Client prefers quarterly reviews. This is a deliberately long synthetic note so that it has to wrap from the first notes line onto the second one.";
  s.acknowledgementType = "single_account";
  s.acknowledgementAccountName = "TFSA 1234";
  s.acknowledgementGoal = "Growth";
  s.accountHolderSignature = fakeSignaturePng(4);
  s.accountHolderDate = "2026-09-23";
  s.jointHolderSignature = fakeSignaturePng(5);
  s.jointHolderDate = "2026-09-24";
  s.advisorName = "Morgan Advisorperson";
  s.advisorSignature = fakeSignaturePng(6);
  s.advisorDate = "2026-09-25";
  return s;
}
