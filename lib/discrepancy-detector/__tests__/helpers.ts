/**
 * Shared test helpers.
 *
 * Risk tolerance on the printed plan block is a percentage spread across five
 * bands, so a test that wants "this plan is Medium" has to say so as an
 * allocation. `setPlanRisk` writes 100% into one band, which is the simplest
 * input that resolves to that band — see `riskFromAllocation` in ../rules for
 * what the engine does with a spread.
 */

import { blankAllocation } from "../blank";
import type { NaafPlan } from "../types";
import type { NaafRiskTolerance } from "../vocab";

export function setPlanRisk(
  plan: NaafPlan,
  column: "current" | "new",
  band: NaafRiskTolerance | null
): void {
  const alloc = blankAllocation();
  if (band !== null) alloc[band] = 100;
  if (column === "new") plan.risk_allocation_new = alloc;
  else plan.risk_allocation_current = alloc;
}
