/**
 * Fills the official Client Risk Questionnaire (form v2-crq25) in any of its
 * three printed editions from a digital QuestionnaireState:
 *
 *   individual  public/crq-individualaccountholder.pdf
 *   joint       public/crq-jointaccountholders.pdf
 *   corporate   public/crq-corporateaccounts.pdf
 *
 * The three templates share field names and layout except the joint edition's
 * second name box (`11txtJointName`), its acknowledgement boxes (`99a`/`98a`
 * instead of `undefined.99`) and its second signature row (`sigClient2_1`,
 * `sigClientDate2_1`). The mapping was read off widget positions against the
 * printed labels and confirmed by rendering filled copies of all three.
 *
 * Every answer box's on-value is its printed letter's position (a=1, b=2, …),
 * checked on every question of every edition.
 *
 * Scores are never recomputed here: per-question points come from
 * `pointsForAnswer` and totals, levels and the ranking from
 * `deriveRiskProfile`, both against the edition's own question sheet (the
 * corporate Question 1 scores differently). A section left incomplete prints
 * no total and no level; a score in the printed band gap (12) prints its total
 * but no level box, exactly as the digital form reports it for review.
 *
 * STATE VALUES WITH NO PLACE ON THE PDF
 *   - acknowledgementGoal (joint): "(Balanced/Growth/High Growth)" is printed
 *     text with no box to tick or field to fill.
 *
 * PDF FIELDS LEFT UNUSED
 *   - txtPrintDate (read-only print stamp), sigSenderInitials (back-office),
 *     the "Get Sore" [sic] button (Acrobat-only calculation trigger).
 *   - sigClient1_1 / sigClient2_1 / sigAdvisor1_1 stay empty as text: the
 *     signature IMAGE is drawn into their rectangle instead.
 */

import { PORTFOLIO_PRIORITIES, RISK_LEVELS_IN_ORDER } from "../risk-questionnaire/config";
import { CRQ_FORMS } from "../risk-questionnaire/forms";
import { deriveRiskProfile, pointsForAnswer } from "../risk-questionnaire/scoring";
import type {
  CrqVariant,
  PortfolioPriorityId,
  QuestionnaireState,
  RiskLevel,
  ScoredQuestionId,
} from "../risk-questionnaire/types";
import { AcroFormFiller, choice, text, wrapText, type Binding } from "./acroform";
import type { FillOptions } from "./types";

type B = Binding<QuestionnaireState>;

/** Rank boxes left of "a) Tax Savings" … "e) Savings". */
const PRIORITY_FIELDS: Record<PortfolioPriorityId, string> = {
  taxSavings: "1a",
  childEducation: "1b",
  retirementPlanning: "1c",
  estatePlanning: "1d",
  savings: "1e",
};

/**
 * Per question: the answer checkbox field (one widget per option, on-value =
 * letter position) and the "Answers:" score box in the Risk Profile Summary.
 * Neither set of names follows question order.
 */
const QUESTION_FIELDS: Record<ScoredQuestionId, { answer: string; score: string }> = {
  q1: { answer: "3a", score: "score3" }, // page 1 left column
  q2: { answer: "4a", score: "score4" },
  q3: { answer: "5a", score: "score5" }, // page 1 right column
  q4: { answer: "26a", score: "score6" },
  q5: { answer: "7a", score: "score7" },
  q6: { answer: "6a", score: "score8" },
  q7: { answer: "12a", score: "score12" }, // page 2
  q8: { answer: "14a", score: "score14" },
  q9: { answer: "15a", score: "score15" },
  q10: { answer: "16a", score: "score16" },
  q11: { answer: "18a", score: "score18" },
  q12: { answer: "17a", score: "score17" }, // page 3
};

/** "How often do you check the value of your investments?" a) Weekly … d) Annually. */
const CHECK_FREQUENCY_FIELD = "19a";

/** Band columns Low … High of the "Your Risk Levels" table and the ranking row. */
const CAPACITY_BAND_FIELDS = ["RCS1", "RCS2", "RCS3", "RCS4", "RCS5"] as const;
const TOLERANCE_BAND_FIELDS = ["RtS1", "RtS2", "RtS3", "RtS4", "RtS5"] as const;
const RANKING_FIELD = "RR1"; // one field, on-values 1..5 = Low … High

const letterValue = (letter: string): string => String(letter.charCodeAt(0) - 96);

const bandIndex = (level: RiskLevel | null): number => (level === null ? -1 : RISK_LEVELS_IN_ORDER.indexOf(level));

/** The declarative mapping for one edition. */
export function crqBindings(variant: CrqVariant): B[] {
  const form = CRQ_FORMS[variant];
  const profile = (s: QuestionnaireState) => deriveRiskProfile(s.answers, form);
  const ack = variant === "joint" ? { all: "99a", single: "98a" } : { all: "undefined.99=1", single: "undefined.99=2" };

  const bindings: B[] = [
    text("CCode", (s) => s.clientId), // "Client ID:" (repeated on every page)
    text("txtNameFL", (s) => s.accountHolderName), // "Account Holder's Name" / "Corporation/Entity's Name"
    ...PORTFOLIO_PRIORITIES.map((p) => text<QuestionnaireState>(PRIORITY_FIELDS[p.id], (s) => s.portfolioPriorities[p.id])),
    choice<QuestionnaireState, string>(
      (s) => s.investmentCheckFrequency,
      Object.fromEntries(
        form.investmentCheckQuestion.options.map((o) => [o.id, `${CHECK_FREQUENCY_FIELD}=${letterValue(o.letter)}`]),
      ),
    ),
  ];

  for (const q of form.questions) {
    const f = QUESTION_FIELDS[q.id];
    bindings.push(
      choice<QuestionnaireState, string>(
        (s) => s.answers[q.id],
        Object.fromEntries(q.options.map((o) => [o.id, `${f.answer}=${letterValue(o.letter)}`])),
      ),
      text(f.score, (s) => pointsForAnswer(q.id, s.answers[q.id], form)),
    );
  }

  bindings.push(
    text("Total1", (s) => profile(s).capacity.score), // Risk Capacity "Score Totals"
    text("Total2", (s) => profile(s).tolerance.score), // Risk Tolerance "Score Totals"
    ...CAPACITY_BAND_FIELDS.map((field, i) =>
      text<QuestionnaireState>(field, (s) => (bandIndex(profile(s).capacityLevel) === i ? profile(s).capacity.score : null)),
    ),
    ...TOLERANCE_BAND_FIELDS.map((field, i) =>
      text<QuestionnaireState>(field, (s) => (bandIndex(profile(s).toleranceLevel) === i ? profile(s).tolerance.score : null)),
    ),
    choice<QuestionnaireState, string>(
      (s) => profile(s).finalRiskRanking,
      Object.fromEntries(RISK_LEVELS_IN_ORDER.map((level, i) => [level, `${RANKING_FIELD}=${i + 1}`])),
    ),
    // Client Acknowledgement: "…for all of my accounts, or" / "…for my ____ account (only)."
    choice((s) => s.acknowledgementType, { all_accounts: ack.all, single_account: ack.single }),
    text("Plan _ID", (s) => (s.acknowledgementType === "single_account" ? s.acknowledgementAccountName : "")),
    text("txtRepNameFL", (s) => s.advisorName), // "Advisor's Name:"
  );

  if (variant === "joint") {
    bindings.push(text("11txtJointName", (s) => s.jointHolderName)); // "Joint Account Holder's Name:"
  }
  return bindings;
}

/** Signature boxes per edition. `client2` exists on the joint edition only. */
export const CRQ_SIGNATURES = {
  client1: { image: "sigClient1_1", date: "sigClientDate1_1" }, // Account Holder / Authorized Signing Officer
  client2: { image: "sigClient2_1", date: "sigClientDate2_1" }, // Joint Account Holder
  advisor: { image: "sigAdvisor1_1", date: "sigAdvisorDate1_1" },
} as const;

/** "Notes:" is two single-line fields; wrap across them, shrinking only if two lines are not enough. */
function fillNotes(filler: AcroFormFiller, notes: string): void {
  const value = filler.sanitize(notes);
  if (!value) {
    filler.clearText("Notesl1");
    filler.clearText("Notesl2");
    return;
  }
  const [first, second] = [filler.form.getTextField("Notesl1"), filler.form.getTextField("Notesl2")];
  const w1 = first.acroField.getWidgets()[0].getRectangle().width - 4;
  const w2 = second.acroField.getWidgets()[0].getRectangle().width - 4;
  for (let size = 10; size >= 5; size -= 0.5) {
    const line1 = wrapText(filler.font, value, size, w1)[0];
    const rest = value.slice(line1.length).trim();
    if (filler.font.widthOfTextAtSize(rest, size) <= w2 || size === 5) {
      filler.setText("Notesl1", line1);
      first.setFontSize(size);
      filler.setText("Notesl2", rest);
      if (rest && filler.font.widthOfTextAtSize(rest, size) <= w2) second.setFontSize(size);
      return;
    }
  }
}

export async function fillCrqPdf(
  template: Uint8Array | ArrayBuffer,
  crq: QuestionnaireState,
  variant: CrqVariant,
  options: FillOptions = {},
): Promise<Uint8Array> {
  const filler = await AcroFormFiller.load(template);
  filler.apply(crq, crqBindings(variant));
  fillNotes(filler, crq.notes);

  const fromState = {
    client1: { signature: crq.accountHolderSignature, date: crq.accountHolderDate },
    client2: { signature: crq.jointHolderSignature, date: crq.jointHolderDate },
    advisor: { signature: crq.advisorSignature, date: crq.advisorDate },
  };
  const roles = variant === "joint" ? (["client1", "client2", "advisor"] as const) : (["client1", "advisor"] as const);
  for (const role of roles) {
    const box = CRQ_SIGNATURES[role];
    filler.setText(box.date, options.dates?.[role] ?? fromState[role].date);
    const override = options.signatures?.[role];
    const signature = override === undefined ? fromState[role].signature : override;
    if (signature) await filler.drawImage(box.image, signature);
  }

  return filler.save(options.flatten ?? false);
}
