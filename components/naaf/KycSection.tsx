"use client";

/**
 * Section C — the four KYC tables, each with a Client A and a Client B column.
 *
 * Net Worth is printed as "Fixed Assets + Liquid Assets – Liabilities", so it
 * is calculated here instead of typed, which removes one way for the figures to
 * disagree with each other.
 */

import type { ReactNode } from "react";

import {
  EXPERIENCE_TYPES,
  INCOME_BANDS,
  KNOWLEDGE_LEVELS,
  NET_WORTH_FORMULA,
  NET_WORTH_INCLUDES_SPOUSE,
  NET_WORTH_ROWS,
  type NetWorthKey,
} from "@/lib/naaf/config";
import { fieldIds, netWorth } from "@/lib/naaf/completeness";
import type { KycColumn, NaafState } from "@/lib/naaf/types";

import { TickBox, issueRing, useIssue } from "./ui";

type Holder = "A" | "B";

const money = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 });

export default function KycSection({
  kyc,
  joint,
  onChange,
  onSpouseChange,
}: {
  kyc: NaafState["kyc"];
  joint: boolean;
  onChange: (holder: Holder, patch: Partial<KycColumn>) => void;
  onSpouseChange: (value: boolean) => void;
}) {
  const setNetWorth = (h: Holder, key: NetWorthKey, value: string) =>
    onChange(h, { netWorth: { ...kyc[h].netWorth, [key]: value } });

  const toggleExperience = (h: Holder, item: (typeof EXPERIENCE_TYPES)[number], on: boolean) => {
    const current = kyc[h].experience;
    onChange(h, { experience: on ? [...current, item] : current.filter((x) => x !== item) });
  };

  return (
    <div className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)]">
      {/* ------------------------------------------------------ Income */}
      <KycTable title="Approximate Income">
        <PairedTicks
          joint={joint}
          groupId={(h) => fieldIds.kyc(h, "income")}
          rows={INCOME_BANDS}
          isChecked={(h, band) => kyc[h].income === band}
          onToggle={(h, band, on) => onChange(h, { income: on ? band : null })}
        />
      </KycTable>

      {/* ------------------------------------------------------ Net worth */}
      <KycTable title="Approximate Net Worth">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] border-b border-[#0000E0]/50 px-2 py-0.5 text-[13.5px] text-[#0000E0]">
          <span>Client A</span>
          <span />
          <span className="text-right">Client B</span>
        </div>
        {NET_WORTH_ROWS.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] border-b border-[#0000E0]/50 last:border-b-0"
          >
            <MoneyCell id={fieldIds.kyc("A", row.key)} label={`${row.label}, Client A`} value={kyc.A.netWorth[row.key]} onChange={(v) => setNetWorth("A", row.key, v)} />
            <div className="border-x border-[#0000E0]/50 px-1 py-1 text-center">
              <p className="text-[14px] font-bold text-[#0000E0]">{row.label}</p>
              <p className="text-[12.5px] leading-tight text-[#0000E0]">{row.sub}</p>
            </div>
            <MoneyCell id={fieldIds.kyc("B", row.key)} label={`${row.label}, Client B`} value={kyc.B.netWorth[row.key]} onChange={(v) => setNetWorth("B", row.key, v)} disabled={!joint} />
          </div>
        ))}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] border-t border-[#0000E0]/50">
          <NetWorthCell column={kyc.A} />
          <div className="border-x border-[#0000E0]/50 px-1 py-1 text-center">
            <p className="text-[14px] font-bold text-[#0000E0]">Net Worth</p>
            <p className="text-[12.5px] leading-tight text-[#0000E0]">{NET_WORTH_FORMULA}</p>
          </div>
          <NetWorthCell column={kyc.B} muted={!joint} />
        </div>
      </KycTable>

      {/* ------------------------------------------------------ Knowledge */}
      <KycTable title="Investment Knowledge">
        <PairedTicks
          joint={joint}
          groupId={(h) => fieldIds.kyc(h, "knowledge")}
          rows={KNOWLEDGE_LEVELS}
          isChecked={(h, level) => kyc[h].knowledge === level}
          onToggle={(h, level, on) => onChange(h, { knowledge: on ? level : null })}
        />
      </KycTable>

      {/* ------------------------------------------------------ Experience */}
      <KycTable title="Investment Experience">
        <PairedTicks
          joint={joint}
          groupId={(h) => fieldIds.kyc(h, "experience")}
          rows={EXPERIENCE_TYPES}
          isChecked={(h, item) => kyc[h].experience.includes(item)}
          onToggle={toggleExperience}
        />
      </KycTable>

      <div className="@2xl:col-span-2 @5xl:col-start-3">
        <TickBox
          checked={kyc.netWorthIncludesSpouse}
          onChange={onSpouseChange}
          label={<b>{NET_WORTH_INCLUDES_SPOUSE}</b>}
          className="text-[15px]"
        />
      </div>
    </div>
  );
}

function KycTable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-[1.5px] border-[#0000E0]">
      <h3 className="border-b-[1.5px] border-[#0000E0] bg-[#EAF1DD] px-2 py-1 text-center text-[15px] font-bold text-[#0000E0]">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * A Client A box, the printed label, and a Client B box on each row. Each
 * column is its own group so a blank Client B is flagged separately from A.
 */
function PairedTicks<T extends string>({
  joint,
  groupId,
  rows,
  isChecked,
  onToggle,
}: {
  joint: boolean;
  groupId: (h: Holder) => string;
  rows: readonly T[];
  isChecked: (h: Holder, row: T) => boolean;
  onToggle: (h: Holder, row: T, on: boolean) => void;
}) {
  const issueA = useIssue(groupId("A"));
  const issueB = useIssue(groupId("B"));
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] text-[13.5px]">
      <span id={groupId("A")} className={`scroll-mt-28 px-2 py-0.5 text-[#0000E0] ${issueRing(issueA)}`}>
        Client A
      </span>
      <span className="border-b border-[#0000E0]/50" />
      <span id={groupId("B")} className={`scroll-mt-28 px-2 py-0.5 text-right text-[#0000E0] ${issueRing(issueB)}`}>
        Client B
      </span>
      {rows.map((row) => (
        <div key={row} className="contents">
          {(["A", "B"] as const).map((h, i) => {
            const box = (
              <span className="flex items-center justify-center px-1.5 py-[3px]">
                <TickBox
                  checked={isChecked(h, row)}
                  onChange={(on) => onToggle(h, row, on)}
                  ariaLabel={`${row}, Client ${h}`}
                  className={h === "B" && !joint ? "pointer-events-none opacity-40" : ""}
                />
              </span>
            );
            return i === 0 ? (
              <span key={h} className="contents">
                {box}
                <span className="whitespace-nowrap py-[3px] text-center text-[#0000E0]">{row}</span>
              </span>
            ) : (
              <span key={h} className="contents">
                {box}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MoneyCell({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const issue = useIssue(id);
  const tone = !issue ? "" : issue === "review" ? "bg-amber-50" : "bg-red-50 ring-2 ring-inset ring-red-500/80";
  return (
    <label className={`flex items-center gap-1 px-1.5 ${tone}`}>
      <span className="text-[#0000E0]">$</span>
      <span className="sr-only">{label}</span>
      <input
        id={id}
        name={id}
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 scroll-mt-28 bg-transparent text-right text-[15px] tabular-nums text-black outline-none disabled:cursor-not-allowed disabled:opacity-40"
      />
    </label>
  );
}

function NetWorthCell({ column, muted = false }: { column: KycColumn; muted?: boolean }) {
  const value = netWorth(column);
  return (
    <div className={`flex items-center gap-1 px-1.5 ${muted ? "opacity-40" : ""}`}>
      <span className="text-[#0000E0]">$</span>
      <output className="w-full text-right text-[15px] font-semibold tabular-nums text-black">
        {value === null ? "" : money.format(value)}
      </output>
    </div>
  );
}
