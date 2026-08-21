"use client";

import { useState, useRef } from "react";
import {
  Wallet,
  PiggyBank,
  Sparkles,
  Flag,
  Table as TableIcon,
  LineChart as LineChartIcon,
  Info,
} from "lucide-react";

/**
 * Compound Interest Calculator.
 *
 * Calculation logic and component structure are preserved from the original
 * tool; only the visual design has been adapted to match the Keybase system
 * (teal brand, slate text, Geist font, clean Apple-like cards).
 */

// Palette mapped onto the Keybase design tokens.
const C = {
  brand: "#0a1f33", // Keybase navy
  brandHover: "#0e2a45",
  brandSoft: "#e6ecf2",
  ink: "#0f172a", // slate-900
  inkSoft: "#475569", // slate-600
  muted: "#64748b", // slate-500
  faint: "#94a3b8", // slate-400
  line: "#e2e8f0", // slate-200
  lineSoft: "#f1f5f9", // slate-100
  white: "#ffffff",
  // Chart / accent series
  balance: "#0a1f33", // brand navy
  contrib: "#94a3b8", // slate
  green: "#3f6f9f", // steel-blue positive accent (kept name for semantic role)
  red: "#b91c1c",
};

function addCommas(n: number | string): string {
  const parts = n.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function formatCurrency(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return "$0";
  const rounded = Math.round(val);
  const negative = rounded < 0;
  const str = addCommas(Math.abs(rounded));
  return negative ? "-$" + str : "$" + str;
}

interface CompoundOption {
  label: string;
  value: number;
}

const COMPOUND_OPTIONS: CompoundOption[] = [
  { label: "Annually", value: 1 },
  { label: "Semi-Annually", value: 2 },
  { label: "Quarterly", value: 4 },
  { label: "Monthly", value: 12 },
  { label: "Daily", value: 365 },
];

interface CalcParams {
  principal: number;
  monthlyContribution: number;
  annualRate: number;
  years: number;
  compoundFreq: number;
  inflationRate: number;
  taxRate: number;
  contributionIncrease: number;
}

interface YearRow {
  year: number;
  balance: number;
  contributions: number;
  interest: number;
  yearInterest: number;
  realBalance: number;
  afterTaxBalance: number;
}

function calculateCompoundInterest(params: CalcParams): YearRow[] {
  const {
    principal,
    monthlyContribution,
    annualRate,
    years,
    compoundFreq,
    inflationRate,
    taxRate,
    contributionIncrease,
  } = params;

  const r = annualRate / 100;
  const inf = inflationRate / 100;
  const tax = taxRate / 100;
  const contribInc = contributionIncrease / 100;
  const n = compoundFreq;

  const yearlyData: YearRow[] = [];
  let balance = principal;
  let totalContributions = principal;
  let totalInterest = 0;
  let currentMonthlyContrib = monthlyContribution;

  // Use a standard compound interest approach:
  // Each month: add contribution, then apply one month's worth of compounded growth.
  // Effective monthly rate from nominal rate compounded n times/year:
  // effectiveMonthlyRate = (1 + r/n)^(n/12) - 1

  for (let year = 1; year <= years; year++) {
    let yearInterest = 0;
    const effectiveMonthlyRate = Math.pow(1 + r / n, n / 12) - 1;

    for (let month = 1; month <= 12; month++) {
      balance += currentMonthlyContrib;
      totalContributions += currentMonthlyContrib;

      const interest = balance * effectiveMonthlyRate;
      yearInterest += interest;
      balance += interest;
    }

    totalInterest += yearInterest;

    const realBalance = balance / Math.pow(1 + inf, year);
    const afterTaxInterest = totalInterest * (1 - tax);
    const afterTaxBalance = totalContributions + afterTaxInterest;

    yearlyData.push({
      year,
      balance: Math.round(balance * 100) / 100,
      contributions: Math.round(totalContributions * 100) / 100,
      interest: Math.round(totalInterest * 100) / 100,
      yearInterest: Math.round(yearInterest * 100) / 100,
      realBalance: Math.round(realBalance * 100) / 100,
      afterTaxBalance: Math.round(afterTaxBalance * 100) / 100,
    });

    currentMonthlyContrib *= 1 + contribInc;
  }

  return yearlyData;
}

interface InputSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
}

function InputSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
  tooltip,
}: InputSliderProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawInput, setRawInput] = useState("");

  const displayValue = isFocused
    ? rawInput
    : step < 1
    ? addCommas(value)
    : addCommas(Math.round(value));

  const handleFocus = () => {
    setIsFocused(true);
    setRawInput(step < 1 ? String(value) : String(Math.round(value)));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, "");
    if (raw === "" || raw === "-" || raw === ".") {
      setRawInput(raw);
      return;
    }
    if (!/^-?\d*\.?\d*$/.test(raw)) return;
    setRawInput(raw);
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const num = parseFloat(rawInput.replace(/,/g, ""));
    if (isNaN(num) || num < min) {
      onChange(min);
    } else if (num > max) {
      onChange(max);
    } else {
      onChange(num);
    }
  };

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <label className="flex items-center text-[13px] font-medium text-slate-700">
          {label}
          {tooltip && (
            <span
              title={tooltip}
              className="ml-1.5 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-slate-400 ring-1 ring-slate-300"
            >
              <Info className="h-2.5 w-2.5" />
            </span>
          )}
        </label>
        <div
          className="flex min-w-[130px] items-center rounded-lg border bg-white px-2.5 py-1 transition-colors"
          style={{ borderColor: isFocused ? C.brand : C.line }}
        >
          {prefix && (
            <span className="mr-0.5 text-sm text-slate-400">{prefix}</span>
          )}
          <input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onFocus={handleFocus}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-[110px] border-none bg-transparent text-right text-sm font-semibold text-slate-900 outline-none tabular-nums"
          />
          {suffix && (
            <span className="ml-0.5 text-[13px] text-slate-400">{suffix}</span>
          )}
        </div>
      </div>
      <div className="relative flex h-7 items-center">
        <div className="absolute left-0 right-0 h-1.5 rounded-full bg-slate-200" />
        <div
          className="absolute left-0 h-1.5 rounded-full transition-[width] duration-150"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${C.brand}, #2c4a72)`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute left-0 right-0 z-[2] h-7 w-full cursor-pointer opacity-0"
        />
        <div
          className="pointer-events-none absolute h-[18px] w-[18px] rounded-full border-[3px] border-white transition-[left] duration-150"
          style={{
            left: `${pct}%`,
            transform: "translateX(-50%)",
            background: C.brand,
            boxShadow: "0 1px 4px rgba(0,109,110,0.45)",
          }}
        />
      </div>
    </div>
  );
}

interface SegmentedControlProps {
  options: CompoundOption[];
  value: number;
  onChange: (v: number) => void;
}

function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex gap-0 rounded-xl bg-slate-100 p-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-lg px-1.5 py-2 text-[12px] transition ${
              active
                ? "bg-[#0a1f33] font-semibold text-white shadow-sm"
                : "font-medium text-slate-500 hover:text-slate-700"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className="relative h-6 w-11 rounded-full border-none transition-colors"
        style={{ background: checked ? C.brand : C.line }}
        aria-pressed={checked}
      >
        <span
          className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-[left]"
          style={{ left: checked ? 23 : 3 }}
        />
      </button>
    </div>
  );
}

interface MiniChartProps {
  data: YearRow[];
  width: number;
  height: number;
  showInflation: boolean;
  showTax: boolean;
}

function MiniChart({ data, width, height, showInflation, showTax }: MiniChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.balance));
  const padding = { top: 30, right: 20, bottom: 40, left: 64 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = chartW / Math.max(data.length - 1, 1);

  const toY = (val: number) => padding.top + chartH - (val / maxVal) * chartH;
  const toX = (i: number) => padding.left + i * xStep;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgWidth = rect.width;
    const scaleX = width / svgWidth;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const chartMouseX = mouseX - padding.left;
    if (chartMouseX < 0 || chartMouseX > chartW) {
      setHoverIndex(null);
      return;
    }
    const idx = Math.round(chartMouseX / xStep);
    const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
    setHoverIndex(clampedIdx);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const contribPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.contributions)}`)
    .join(" ");
  const contribArea =
    contribPath +
    ` L ${toX(data.length - 1)} ${padding.top + chartH} L ${toX(0)} ${
      padding.top + chartH
    } Z`;

  const balancePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.balance)}`)
    .join(" ");
  const balanceArea =
    balancePath +
    ` L ${toX(data.length - 1)} ${padding.top + chartH} L ${toX(0)} ${
      padding.top + chartH
    } Z`;

  const realPath = showInflation
    ? data
        .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.realBalance)}`)
        .join(" ")
    : "";
  const taxPath = showTax
    ? data
        .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.afterTaxBalance)}`)
        .join(" ")
    : "";

  const yTicks = 5;
  const yLines = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal / yTicks) * i);

  const xLabelInterval = data.length <= 10 ? 1 : data.length <= 20 ? 2 : 5;

  const hd = hoverIndex !== null ? data[hoverIndex] : null;
  const tooltipX = hoverIndex !== null ? toX(hoverIndex) : 0;
  const tooltipFlip = tooltipX > width - 220;
  const tipFont = "var(--font-geist-sans), system-ui, sans-serif";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", cursor: hoverIndex !== null ? "crosshair" : "default" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <defs>
        <linearGradient id="ciBalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.brand} stopOpacity="0.18" />
          <stop offset="100%" stopColor={C.brand} stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="ciContGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.contrib} stopOpacity="0.16" />
          <stop offset="100%" stopColor={C.contrib} stopOpacity="0.01" />
        </linearGradient>
        <filter id="ciTooltipShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
      </defs>

      {yLines.map((val, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={toY(val)}
            x2={width - padding.right}
            y2={toY(val)}
            stroke={C.lineSoft}
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={toY(val) + 4}
            textAnchor="end"
            fontSize="10"
            fill={C.faint}
            fontFamily={tipFont}
          >
            {formatCurrency(val)}
          </text>
        </g>
      ))}

      {data.map((d, i) =>
        i % xLabelInterval === 0 || i === data.length - 1 ? (
          <text
            key={i}
            x={toX(i)}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            fill={hoverIndex === i ? C.ink : C.faint}
            fontWeight={hoverIndex === i ? "700" : "400"}
            fontFamily={tipFont}
          >
            Yr {d.year}
          </text>
        ) : null
      )}

      <path d={balanceArea} fill="url(#ciBalGrad)" />
      <path d={contribArea} fill="url(#ciContGrad)" />

      <path d={contribPath} fill="none" stroke={C.contrib} strokeWidth="2.5" strokeLinecap="round" />
      <path d={balancePath} fill="none" stroke={C.balance} strokeWidth="2.5" strokeLinecap="round" />

      {showInflation && (
        <path d={realPath} fill="none" stroke={C.green} strokeWidth="2" strokeDasharray="6,4" strokeLinecap="round" />
      )}
      {showTax && (
        <path d={taxPath} fill="none" stroke={C.red} strokeWidth="2" strokeDasharray="4,4" strokeLinecap="round" />
      )}

      {hoverIndex === null && data.length > 0 && (
        <>
          <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1].balance)} r="5" fill={C.balance} stroke={C.white} strokeWidth="2" />
          <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1].contributions)} r="5" fill={C.contrib} stroke={C.white} strokeWidth="2" />
        </>
      )}

      {/* Hover crosshair, dots, and tooltip */}
      {hd && (
        <g>
          <line
            x1={tooltipX}
            y1={padding.top}
            x2={tooltipX}
            y2={padding.top + chartH}
            stroke={C.ink}
            strokeWidth="1"
            strokeDasharray="4,3"
            opacity="0.3"
          />

          <circle cx={tooltipX} cy={toY(hd.balance)} r="6" fill={C.balance} stroke={C.white} strokeWidth="2.5" />
          <circle cx={tooltipX} cy={toY(hd.contributions)} r="6" fill={C.contrib} stroke={C.white} strokeWidth="2.5" />
          {showInflation && <circle cx={tooltipX} cy={toY(hd.realBalance)} r="5" fill={C.green} stroke={C.white} strokeWidth="2" />}
          {showTax && <circle cx={tooltipX} cy={toY(hd.afterTaxBalance)} r="5" fill={C.red} stroke={C.white} strokeWidth="2" />}

          <g
            transform={`translate(${tooltipFlip ? tooltipX - 212 : tooltipX + 12}, ${Math.max(
              padding.top,
              toY(hd.balance) - 40
            )})`}
            filter="url(#ciTooltipShadow)"
          >
            <rect
              x="0"
              y="0"
              width="200"
              height={showInflation || showTax ? (showInflation && showTax ? 120 : 102) : 84}
              rx="10"
              ry="10"
              fill={C.ink}
            />
            <text x="12" y="20" fontSize="11" fontWeight="700" fill="#9db8d6" fontFamily={tipFont} letterSpacing="0.06em">
              YEAR {hd.year}
            </text>
            <line x1="12" y1="27" x2="188" y2="27" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
            <circle cx="18" cy="41" r="4" fill={C.balance} />
            <text x="28" y="38" fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily={tipFont} fontWeight="600">Balance</text>
            <text x="188" y="44" textAnchor="end" fontSize="12" fontWeight="700" fill={C.white} fontFamily={tipFont}>{formatCurrency(hd.balance)}</text>
            <circle cx="18" cy="59" r="4" fill={C.contrib} />
            <text x="28" y="56" fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily={tipFont} fontWeight="600">Contributed</text>
            <text x="188" y="62" textAnchor="end" fontSize="12" fontWeight="700" fill={C.white} fontFamily={tipFont}>{formatCurrency(hd.contributions)}</text>
            <circle cx="18" cy="77" r="4" fill={C.green} />
            <text x="28" fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily={tipFont} fontWeight="600">
              <tspan x="28" y="70">Capital Gains</tspan>
              <tspan x="28" y="79">and Dividends</tspan>
            </text>
            <text x="188" y="80" textAnchor="end" fontSize="12" fontWeight="700" fill={C.white} fontFamily={tipFont}>{formatCurrency(hd.interest)}</text>
            {showInflation && (
              <>
                <circle cx="18" cy="95" r="4" fill={C.green} />
                <text x="28" y="92" fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily={tipFont} fontWeight="600">Real Value</text>
                <text x="188" y="98" textAnchor="end" fontSize="12" fontWeight="700" fill={C.white} fontFamily={tipFont}>{formatCurrency(hd.realBalance)}</text>
              </>
            )}
            {showTax && (
              <>
                <circle cx="18" cy={showInflation ? 113 : 95} r="4" fill={C.red} />
                <text x="28" y={showInflation ? 110 : 92} fontSize="9" fill="rgba(255,255,255,0.55)" fontFamily={tipFont} fontWeight="600">After Tax</text>
                <text x="188" y={showInflation ? 116 : 98} textAnchor="end" fontSize="12" fontWeight="700" fill={C.white} fontFamily={tipFont}>{formatCurrency(hd.afterTaxBalance)}</text>
              </>
            )}
          </g>
        </g>
      )}
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  accent: string;
  icon: React.ReactNode;
  compact?: boolean;
}

function StatCard({ label, value, subValue, accent, icon, compact }: StatCardProps) {
  return (
    <div
      className={`flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm ${
        compact ? "p-3" : "p-4"
      }`}
      style={{ minWidth: 150, borderLeft: `3px solid ${accent}` }}
    >
      <div className={`flex items-center gap-2 ${compact ? "mb-1" : "mb-1.5"}`}>
        <span
          className={`flex items-center justify-center rounded-lg ${
            compact ? "h-6 w-6" : "h-7 w-7"
          }`}
          style={{ background: `${accent}1a`, color: accent }}
        >
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <div
        className={`font-semibold tracking-tight text-slate-900 tabular-nums ${
          compact ? "text-lg" : "text-xl"
        }`}
      >
        {value}
      </div>
      {subValue && <div className="mt-0.5 text-[11px] text-slate-400">{subValue}</div>}
    </div>
  );
}

interface MilestoneTrackerProps {
  data: YearRow[];
  milestones: number[];
}

function MilestoneTracker({ data, milestones }: MilestoneTrackerProps) {
  if (!data || data.length === 0) return null;

  const reached = milestones.map((m) => {
    const yr = data.find((d) => d.balance >= m);
    return { target: m, year: yr ? yr.year : null };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Flag className="h-4 w-4 text-[#0a1f33]" />
        Milestone Tracker
      </h3>
      <div className="flex flex-col gap-3">
        {reached.map((m, i) => {
          const finalBal = data[data.length - 1]?.balance || 0;
          const pct = Math.min((finalBal / m.target) * 100, 100);
          return (
            <div key={i}>
              <div className="mb-1 flex justify-between">
                <span className="text-xs font-semibold text-slate-700 tabular-nums">
                  {formatCurrency(m.target)}
                </span>
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: m.year ? C.green : C.faint }}
                >
                  {m.year ? `Reached · Year ${m.year}` : "Not reached"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${pct}%`,
                    background: m.year ? C.green : C.brand,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface YearlyTableProps {
  data: YearRow[];
  showInflation: boolean;
  showTax: boolean;
}

function YearlyTable({ data, showInflation, showTax }: YearlyTableProps) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? data : data.slice(0, 5);

  const th =
    "px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <TableIcon className="h-4 w-4 text-[#0a1f33]" />
          Year by Year Breakdown
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs tabular-nums">
          <thead>
            <tr className="bg-slate-50">
              <th className={`${th} text-left`}>Year</th>
              <th className={`${th} text-right`}>Contributions</th>
              <th className={`${th} text-right`}>Interest (Year)</th>
              <th className={`${th} text-right`}>Balance</th>
              {showInflation && (
                <th className={`${th} text-right`} style={{ color: C.green }}>
                  Real Value
                </th>
              )}
              {showTax && (
                <th className={`${th} text-right`} style={{ color: C.red }}>
                  After Tax
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {display.map((d, i) => (
              <tr
                key={d.year}
                className="border-b border-slate-100"
                style={{ background: i % 2 === 0 ? C.white : "#fafbfc" }}
              >
                <td className="px-3.5 py-2.5 font-semibold text-slate-900">{d.year}</td>
                <td className="px-3.5 py-2.5 text-right font-medium" style={{ color: C.contrib }}>
                  {formatCurrency(d.contributions)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-medium" style={{ color: C.brand }}>
                  {formatCurrency(d.yearInterest)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-semibold text-slate-900">
                  {formatCurrency(d.balance)}
                </td>
                {showInflation && (
                  <td className="px-3.5 py-2.5 text-right font-medium" style={{ color: C.green }}>
                    {formatCurrency(d.realBalance)}
                  </td>
                )}
                {showTax && (
                  <td className="px-3.5 py-2.5 text-right font-medium" style={{ color: C.red }}>
                    {formatCurrency(d.afterTaxBalance)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full bg-slate-50 py-3 text-xs font-semibold tracking-wide text-[#0a1f33] transition hover:bg-slate-100"
        >
          {expanded ? "Show less" : `Show all ${data.length} years`}
        </button>
      )}
    </div>
  );
}

/**
 * `compact` tightens padding, type sizes, and chart height for embedding the
 * calculator inside a page section (e.g. the homepage) rather than giving it a
 * full page of its own.
 */
export default function CompoundInterestCalculator({
  compact = false,
}: {
  compact?: boolean;
} = {}) {
  const [principal, setPrincipal] = useState(10000);
  const [monthlyContrib, setMonthlyContrib] = useState(500);
  const [annualRate, setAnnualRate] = useState(7);
  const [years, setYears] = useState(25);
  const [compoundFreq, setCompoundFreq] = useState(12);
  const [inflationRate, setInflationRate] = useState(2);
  const [taxRate, setTaxRate] = useState(30);
  const [contributionIncrease, setContributionIncrease] = useState(2);

  const [showInflation, setShowInflation] = useState(false);
  const [showTax, setShowTax] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "table">("chart");

  const data = calculateCompoundInterest({
    principal,
    monthlyContribution: monthlyContrib,
    annualRate,
    years,
    compoundFreq,
    inflationRate: showInflation ? inflationRate : 0,
    taxRate: showTax ? taxRate : 0,
    contributionIncrease: showAdvanced ? contributionIncrease : 0,
  });

  const finalData =
    data[data.length - 1] || {
      balance: 0,
      contributions: 0,
      interest: 0,
      realBalance: 0,
      afterTaxBalance: 0,
    };
  const interestPct =
    finalData.balance > 0
      ? ((finalData.interest / finalData.balance) * 100).toFixed(1)
      : "0";

  const milestones = [100000, 250000, 500000, 1000000, 2000000].filter(
    (m) => m <= finalData.balance * 1.5 && m > principal
  );

  return (
    <div>
      {/* Stats Row */}
      <div className={`flex flex-wrap ${compact ? "mb-3 gap-2" : "mb-4 gap-3"}`}>
        <StatCard
          label="Total Balance"
          value={formatCurrency(finalData.balance)}
          subValue={`After ${years} years`}
          accent={C.brand}
          icon={<Wallet className="h-4 w-4" />}
          compact={compact}
        />
        <StatCard
          label="Total Contributed"
          value={formatCurrency(finalData.contributions)}
          subValue={`${formatCurrency(monthlyContrib)}/mo`}
          accent={C.contrib}
          icon={<PiggyBank className="h-4 w-4" />}
          compact={compact}
        />
        <StatCard
          label="Capital Gains and Dividends"
          value={formatCurrency(finalData.interest)}
          subValue={`${interestPct}% of total`}
          accent={C.green}
          icon={<Sparkles className="h-4 w-4" />}
          compact={compact}
        />
      </div>

      {/* Two Column Layout */}
      <div
        className={`grid items-start lg:grid-cols-[minmax(260px,340px)_1fr] ${
          compact ? "gap-3" : "gap-4"
        }`}
      >
        {/* Left: Inputs */}
        <div
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
            compact ? "p-4" : "p-5"
          }`}
        >
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Your Inputs</h2>

          <InputSlider label="Initial Investment" value={principal} onChange={setPrincipal} min={0} max={2000000} step={1000} prefix="$" tooltip="The starting amount you invest today" />
          <InputSlider label="Monthly Contribution" value={monthlyContrib} onChange={setMonthlyContrib} min={0} max={50000} step={50} prefix="$" tooltip="How much you add each month" />
          <InputSlider label="Expected Annual Return" value={annualRate} onChange={setAnnualRate} min={0} max={20} step={0.1} suffix="%" tooltip="Average annual rate of return on your investments" />
          <InputSlider label="Time Horizon" value={years} onChange={setYears} min={1} max={50} step={1} suffix=" yrs" tooltip="How many years you plan to invest" />

          <div className="mb-4">
            <label className="mb-2 block text-[13px] font-medium text-slate-700">
              Compounding Frequency
            </label>
            <SegmentedControl options={COMPOUND_OPTIONS} value={compoundFreq} onChange={setCompoundFreq} />
          </div>

          {/* Toggle Switches */}
          <div className="mt-2 border-t border-slate-100 pt-4">
            <ToggleRow label="Adjust for Inflation" checked={showInflation} onChange={() => setShowInflation(!showInflation)} />
            {showInflation && (
              <InputSlider label="Annual Inflation Rate" value={inflationRate} onChange={setInflationRate} min={0} max={10} step={0.1} suffix="%" />
            )}

            <ToggleRow label="Show Tax Impact" checked={showTax} onChange={() => setShowTax(!showTax)} />
            {showTax && (
              <InputSlider label="Marginal Tax Rate" value={taxRate} onChange={setTaxRate} min={0} max={60} step={1} suffix="%" tooltip="Your estimated marginal tax rate on investment income" />
            )}

            <ToggleRow label="Annual Contribution Increase" checked={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)} />
            {showAdvanced && (
              <InputSlider label="Yearly Contribution Increase" value={contributionIncrease} onChange={setContributionIncrease} min={0} max={15} step={0.5} suffix="%" tooltip="Increase your monthly contribution by this % each year (e.g. to match salary raises)" />
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
          {/* Chart / Table Toggle */}
          <div className="flex gap-2">
            {(["chart", "table"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center gap-2 rounded-xl border text-[13px] font-semibold transition ${
                    compact ? "px-3.5 py-2" : "px-4 py-2.5"
                  } ${
                    active
                      ? "border-[#0a1f33] bg-white text-slate-900 shadow-sm"
                      : "border-slate-200 bg-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab === "chart" ? (
                    <>
                      <LineChartIcon className="h-4 w-4" /> Growth Chart
                    </>
                  ) : (
                    <>
                      <TableIcon className="h-4 w-4" /> Year by Year
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {activeTab === "chart" && (
            <div
              className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
                compact ? "p-3" : "p-4"
              }`}
            >
              {/* Legend */}
              <div className={`flex flex-wrap gap-4 pl-2 ${compact ? "mb-2" : "mb-3"}`}>
                <div className="flex items-center gap-1.5">
                  <span className="h-[3px] w-3.5 rounded-full" style={{ background: C.balance }} />
                  <span className="text-[11px] font-medium text-slate-500">Total Balance</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-[3px] w-3.5 rounded-full" style={{ background: C.contrib }} />
                  <span className="text-[11px] font-medium text-slate-500">Contributions</span>
                </div>
                {showInflation && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-[3px] w-3.5 rounded-full" style={{ background: C.green }} />
                    <span className="text-[11px] font-medium text-slate-500">Real Value</span>
                  </div>
                )}
                {showTax && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-[3px] w-3.5 rounded-full" style={{ background: C.red }} />
                    <span className="text-[11px] font-medium text-slate-500">After Tax</span>
                  </div>
                )}
              </div>
              <MiniChart data={data} width={560} height={compact ? 200 : 260} showInflation={showInflation} showTax={showTax} />
            </div>
          )}

          {activeTab === "table" && (
            <YearlyTable data={data} showInflation={showInflation} showTax={showTax} />
          )}

          {/* Milestones */}
          {milestones.length > 0 && <MilestoneTracker data={data} milestones={milestones} />}

          {/* Insight Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4 text-white"
              style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandHover})` }}
            >
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Power of Compounding
              </div>
              <div className="text-xl font-semibold tracking-tight tabular-nums">
                {((finalData.interest / Math.max(finalData.contributions - principal, 1)) * 100).toFixed(0)}%
              </div>
              <div className="mt-1 text-[11px] text-white/60">Return on your contributions</div>
            </div>
            <div
              className="rounded-2xl p-4 text-white"
              style={{ background: `linear-gradient(135deg, ${C.brand}, ${C.brandHover})` }}
            >
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Effective Monthly Income
              </div>
              <div className="text-xl font-semibold tracking-tight tabular-nums">
                {formatCurrency((finalData.balance * (annualRate / 100)) / 12)}
              </div>
              <div className="mt-1 text-[11px] text-white/60">
                If invested at {annualRate}% in retirement
              </div>
            </div>
          </div>

          {showInflation && (
            <div
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              style={{ borderLeft: `3px solid ${C.green}` }}
            >
              <div className="mb-1 text-xs font-semibold text-slate-900">Inflation Impact</div>
              <div className="text-xs leading-relaxed text-slate-500">
                Your {formatCurrency(finalData.balance)} will have the purchasing power of approximately{" "}
                <strong style={{ color: C.green }}>{formatCurrency(finalData.realBalance)}</strong> in
                today&apos;s dollars, meaning inflation erodes about{" "}
                <strong style={{ color: C.red }}>
                  {formatCurrency(finalData.balance - finalData.realBalance)}
                </strong>{" "}
                of purchasing power over {years} years.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div
        className="mt-6 rounded-xl bg-slate-900/[0.03] px-6 py-4"
        style={{ borderLeft: `3px solid ${C.faint}` }}
      >
        <p className="m-0 text-[11px] leading-relaxed text-slate-500">
          <strong className="text-slate-600">Disclaimer:</strong> This calculator is provided for
          illustrative purposes only and does not constitute financial, investment, or tax advice.
          Actual investment returns will vary and past performance does not guarantee future results.
          Please consult with a qualified financial advisor before making any investment decisions.
          Calculations assume a constant rate of return and do not account for fees, commissions, or
          market volatility.
        </p>
      </div>
    </div>
  );
}
