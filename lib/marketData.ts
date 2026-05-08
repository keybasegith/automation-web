export const MARKET_EVENTS = ["Market Drop", "Market Rally", "Stable"] as const;
export type MarketEvent = (typeof MARKET_EVENTS)[number];

export interface MarketData {
  sp500Change: number;
  nasdaqChange: number;
  date: string;
}

const SCENARIOS: ReadonlyArray<Omit<MarketData, "date">> = [
  { sp500Change: -5.2, nasdaqChange: -6.1 },
  { sp500Change: -3.4, nasdaqChange: -3.8 },
  { sp500Change: -1.1, nasdaqChange: -1.5 },
  { sp500Change: 0.4, nasdaqChange: 0.7 },
  { sp500Change: 1.8, nasdaqChange: 2.1 },
  { sp500Change: 3.2, nasdaqChange: 3.9 },
  { sp500Change: 5.5, nasdaqChange: 6.2 },
];

const today = (): string => new Date().toISOString().slice(0, 10);

export function getMarketData(): MarketData {
  return { ...SCENARIOS[0], date: today() };
}

export function randomMarketData(exclude?: MarketData): MarketData {
  if (SCENARIOS.length === 1) {
    return { ...SCENARIOS[0], date: today() };
  }
  let pick = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  if (exclude) {
    while (
      pick.sp500Change === exclude.sp500Change &&
      pick.nasdaqChange === exclude.nasdaqChange
    ) {
      pick = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    }
  }
  return { ...pick, date: today() };
}

export function getMarketEvent(data: MarketData): MarketEvent {
  if (data.sp500Change <= -3) return "Market Drop";
  if (data.sp500Change >= 3) return "Market Rally";
  return "Stable";
}
