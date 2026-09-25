"use client";

/**
 * The shorter wizard screens: getting started, financial profile, trusted
 * contact & consents, and the advisor's section.
 */

import { Building2, User, Users } from "lucide-react";

import {
  ADVISOR_QUESTIONS,
  CASL_CONSENT,
  EDD_CONSENT,
  EXPERIENCE_TYPES,
  FORM_TYPES,
  INCOME_BANDS,
  KNOWLEDGE_LEVELS,
  NET_WORTH_INCLUDES_SPOUSE,
  NET_WORTH_ROWS,
  OBA_INTRO,
  TCP_PARAGRAPH,
} from "@/lib/naaf/config";
import { fieldIds, netWorth } from "@/lib/naaf/completeness";
import type { KycColumn, NaafState } from "@/lib/naaf/types";
import type { AccountKind } from "@/lib/client-onboarding/draft";

import { Checkbox, CheckboxGroup, Choice, FillsNote, Grid, MoneyInput, Section, Select, TextInput, YesNo } from "./fields";

type OnNaaf = (update: (prev: NaafState) => NaafState) => void;

const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

// ---------------------------------------------------------------- start

const KINDS: { kind: AccountKind; title: string; body: string; Icon: typeof User }[] = [
  { kind: "individual", title: "Individual", body: "One account holder. Individual CRQ.", Icon: User },
  { kind: "joint", title: "Joint", body: "Two account holders. Joint CRQ, both sign.", Icon: Users },
  { kind: "corporate", title: "Corporate / entity", body: "A corporation, trust or other entity. Corporate CRQ.", Icon: Building2 },
];

export function StartStep({
  naaf,
  onNaaf,
  kind,
  onKind,
}: {
  naaf: NaafState;
  onNaaf: OnNaaf;
  kind: AccountKind;
  onKind: (kind: AccountKind) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="What kind of account is this?" description="Decides which Client Risk Questionnaire applies and who signs.">
        <div role="radiogroup" aria-label="Account type" className="grid gap-3 @2xl:grid-cols-3">
          {KINDS.map(({ kind: k, title, body, Icon }) => {
            const selected = k === kind;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onKind(k)}
                className={`flex items-start gap-3 rounded-[10px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B6165]/25 ${
                  selected ? "border-[#0B6165] bg-[#EEF5F5] ring-1 ring-[#0B6165]" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    selected ? "bg-[#0B6165] text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon aria-hidden className="h-4.5 w-4.5" />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-slate-900">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-slate-500">{body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Application">
        <Grid>
          <Choice
            id={fieldIds.formType}
            label="This application is for"
            options={FORM_TYPES}
            value={naaf.formType}
            onChange={(formType) => onNaaf((p) => ({ ...p, formType }))}
          />
          <div>
            <TextInput
              id={fieldIds.clientId}
              label="Keybase Client ID"
              value={naaf.clientId}
              onChange={(clientId) => onNaaf((p) => ({ ...p, clientId }))}
              hint="An existing client with this ID is updated rather than duplicated."
            />
            <FillsNote>Also fills the CRQ Client ID</FillsNote>
          </div>
        </Grid>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- financial profile

function KycColumnFields({
  holder,
  label,
  column,
  onChange,
  showsCrq,
}: {
  holder: "A" | "B";
  label: string;
  column: KycColumn;
  onChange: (changes: Partial<KycColumn>) => void;
  showsCrq: boolean;
}) {
  const worth = netWorth(column);
  const id = (field: string) => fieldIds.kyc(holder, field);
  return (
    <Section title={label}>
      <div className="flex flex-col gap-5">
        <div>
          <Select
            id={id("income")}
            label="Approximate annual income (all sources)"
            options={INCOME_BANDS}
            value={column.income}
            onChange={(income) => onChange({ income })}
            className="max-w-sm"
          />
          {showsCrq && <FillsNote>Answers CRQ Question 3</FillsNote>}
        </div>

        <div>
          <Grid cols={4}>
            {NET_WORTH_ROWS.map((row) => (
              <MoneyInput
                key={row.key}
                id={id(row.key)}
                label={row.label}
                value={column.netWorth[row.key]}
                onChange={(v) => onChange({ netWorth: { ...column.netWorth, [row.key]: v } })}
              />
            ))}
            <div>
              <p className="mb-1 text-[13px] font-medium text-slate-700">Net worth</p>
              <p className="flex h-10 items-center rounded-[7px] bg-slate-50 px-3 text-[15px] font-semibold tabular-nums text-slate-900">
                {worth === null ? "—" : money.format(worth)}
              </p>
            </div>
          </Grid>
          <p className="mt-1.5 text-[12px] text-slate-500">
            Liquid + fixed assets − liabilities. Enter 0 where there is none.
            {showsCrq && " The net worth answers CRQ Question 5."}
          </p>
        </div>

        <Choice
          id={id("knowledge")}
          label="Investment knowledge"
          options={KNOWLEDGE_LEVELS}
          value={column.knowledge}
          onChange={(knowledge) => onChange({ knowledge })}
        />
        <CheckboxGroup
          id={id("experience")}
          label="Investment experience (tick None if none)"
          options={EXPERIENCE_TYPES}
          values={column.experience}
          onChange={(experience) => onChange({ experience })}
        />
      </div>
    </Section>
  );
}

export function FinancialStep({ naaf, onNaaf, kind }: { naaf: NaafState; onNaaf: OnNaaf; kind: AccountKind }) {
  const set = (h: "A" | "B") => (changes: Partial<KycColumn>) =>
    onNaaf((p) => ({ ...p, kyc: { ...p.kyc, [h]: { ...p.kyc[h], ...changes } } }));
  const joint = naaf.hasJointHolder;
  return (
    <div className="flex flex-col gap-4">
      <KycColumnFields
        holder="A"
        label={joint ? "Account holder (Client A)" : kind === "corporate" ? "The entity" : "Account holder"}
        column={naaf.kyc.A}
        onChange={set("A")}
        showsCrq={kind !== "joint"}
      />
      {joint && (
        <KycColumnFields holder="B" label="Joint account holder (Client B)" column={naaf.kyc.B} onChange={set("B")} showsCrq={false} />
      )}
      <Section>
        <Checkbox
          checked={naaf.kyc.netWorthIncludesSpouse}
          onChange={(netWorthIncludesSpouse) => onNaaf((p) => ({ ...p, kyc: { ...p.kyc, netWorthIncludesSpouse } }))}
        >
          {NET_WORTH_INCLUDES_SPOUSE}
        </Checkbox>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- contacts & consents

export function ContactsStep({ naaf, onNaaf }: { naaf: NaafState; onNaaf: OnNaaf }) {
  const tcp = (field: keyof NaafState["tcp"]) => ({
    id: fieldIds.tcp(field),
    value: naaf.tcp[field],
    onChange: (value: string) => onNaaf((p) => ({ ...p, tcp: { ...p.tcp, [field]: value } })),
  });
  return (
    <div className="flex flex-col gap-4">
      <Section title="Trusted Contact Person" description={<Collapsible text={TCP_PARAGRAPH} />}>
        <Grid cols={3}>
          <TextInput {...tcp("firstName")} label="First name" />
          <TextInput {...tcp("surname")} label="Surname" />
          <TextInput {...tcp("relationship")} label="Relationship to client" />
          <TextInput {...tcp("phone")} label="Phone" type="tel" inputMode="tel" />
          <TextInput {...tcp("email")} label="Email" type="email" inputMode="email" />
        </Grid>
      </Section>

      <Section title="Canadian Anti-Spam Legislation (CASL)">
        <Checkbox id={fieldIds.casl} checked={naaf.caslConsent} onChange={(caslConsent) => onNaaf((p) => ({ ...p, caslConsent }))}>
          {CASL_CONSENT}
        </Checkbox>
      </Section>

      <Section title="Electronic Delivery of Documents (EDD)">
        <Checkbox id={fieldIds.edd} checked={naaf.eddConsent} onChange={(eddConsent) => onNaaf((p) => ({ ...p, eddConsent }))}>
          {EDD_CONSENT}
        </Checkbox>
      </Section>
    </div>
  );
}

/** Long printed disclosure, shown in full on request. */
function Collapsible({ text }: { text: string }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-[13px] text-[#0B6165] underline-offset-2 hover:underline">
        Read what this means for the client
      </summary>
      <span className="mt-2 block text-[13px] leading-relaxed text-slate-600">{text}</span>
    </details>
  );
}

// ---------------------------------------------------------------- advisor

export function AdvisorStep({ naaf, onNaaf }: { naaf: NaafState; onNaaf: OnNaaf }) {
  const adv = naaf.advisor;
  const setAdv = (changes: Partial<NaafState["advisor"]>) => onNaaf((p) => ({ ...p, advisor: { ...p.advisor, ...changes } }));
  const setOba = (changes: Partial<NaafState["oba"]>) => onNaaf((p) => ({ ...p, oba: { ...p.oba, ...changes } }));
  return (
    <div className="flex flex-col gap-4">
      <Section title="Advisor">
        <Grid cols={3}>
          <div>
            <TextInput id={fieldIds.advisor("name")} label="Advisor's name" value={adv.name} onChange={(name) => setAdv({ name })} />
            <FillsNote>Also fills the CRQ advisor block</FillsNote>
          </div>
          <TextInput id={fieldIds.advisor("dealerCode")} label="Dealer code" value={adv.dealerCode} onChange={(dealerCode) => setAdv({ dealerCode })} />
          <TextInput id={fieldIds.advisor("repCode")} label="Rep code" value={adv.repCode} onChange={(repCode) => setAdv({ repCode })} />
        </Grid>
      </Section>

      <Section title="Advisor declarations">
        <div className="flex flex-col gap-4">
          {ADVISOR_QUESTIONS.map((q) => (
            <YesNo
              key={q.key}
              id={fieldIds.advisor(q.key)}
              label={
                <>
                  {q.text} {q.note && <span className="text-slate-500">{q.note}</span>}
                </>
              }
              value={adv.answers[q.key]}
              onChange={(v) => setAdv({ answers: { ...adv.answers, [q.key]: v } })}
            />
          ))}
        </div>
      </Section>

      <Section title="Outside business activities" description={<Collapsible text={OBA_INTRO} />}>
        <Checkbox checked={naaf.oba.notApplicable} onChange={(notApplicable) => setOba({ notApplicable })}>
          Not applicable — the advisor has no outside business activities
        </Checkbox>
        {!naaf.oba.notApplicable && (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor={fieldIds.oba("description")} className="mb-1 block text-[13px] font-medium text-slate-700">
                Other products and/or services the advisor provides
              </label>
              <textarea
                id={fieldIds.oba("description")}
                rows={3}
                value={naaf.oba.description}
                onChange={(e) => setOba({ description: e.target.value })}
                className="w-full scroll-mt-32 rounded-[7px] border border-slate-300 px-3 py-2 text-[15px] outline-none focus-visible:border-[#0B6165] focus-visible:ring-4 focus-visible:ring-[#0B6165]/25"
              />
            </div>
            <Grid>
              <TextInput
                id={fieldIds.oba("primaryInitials")}
                label="Account holder's initials"
                value={naaf.oba.primaryInitials}
                onChange={(primaryInitials) => setOba({ primaryInitials })}
                hint="The client initials to acknowledge the disclosure."
              />
              {naaf.hasJointHolder && (
                <TextInput
                  id={fieldIds.oba("jointInitials")}
                  label="Joint account holder's initials"
                  value={naaf.oba.jointInitials}
                  onChange={(jointInitials) => setOba({ jointInitials })}
                />
              )}
            </Grid>
          </div>
        )}
      </Section>
    </div>
  );
}
