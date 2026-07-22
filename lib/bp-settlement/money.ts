/**
 * Decimal-safe money for Daily Settlement.
 *
 * Re-exports the battle-tested integer-cents helpers from the existing
 * net-settlement engine so both features share one implementation. Financial
 * amounts are NEVER floating point — always integer cents.
 */

export {
  parseAmountToCents,
  formatCents,
  formatMoney,
  sumCents,
} from "@/lib/net-settlement/money";

import { AMOUNT_TOLERANCE_CENTS } from "./constants";

/** True when two cent amounts are equal within the configured tolerance. */
export function amountsEqual(
  a: number,
  b: number,
  toleranceCents: number = AMOUNT_TOLERANCE_CENTS
): boolean {
  return Math.abs(a - b) <= toleranceCents;
}
