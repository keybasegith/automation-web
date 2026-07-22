/**
 * Tunable policy for the Discrepancy Detector.
 *
 * Everything here is a compliance decision, not an engineering one. The two
 * [CONFIRM] items below were flagged in the build spec as awaiting sign-off from
 * the compliance team; the specified defaults are implemented and both are
 * changeable here without touching rule logic.
 */

export interface DetectorConfig {
  /**
   * [CONFIRM #1] CRQ score boundary at 12.
   *
   * The printed form shows "< 12" then "13 - 24", which leaves the value 12
   * undefined. Default: 12 resolves to "Low" (Low = <= 12, Low Medium starts at
   * 13).
   *
   * To make 12 fall into "Low Medium" instead, set this to 11 — the boundary is
   * read as "the highest total that still scores Low".
   */
  lowBandUpperBound: number;

  /**
   * [CONFIRM #2] NAAF plan risk tolerance: New vs. Current column.
   *
   * Default "new": read the New column (this is a new-account review), falling
   * back to Current when New is blank. Set to "current" to invert the priority.
   */
  planRiskColumnPriority: "new" | "current";

  /**
   * Whether informational notes (e.g. an under-risk X2 result) are included in
   * the drafted advisor email. Deficiencies are always included.
   */
  includeNotesInEmail: boolean;
}

export const DEFAULT_CONFIG: DetectorConfig = {
  lowBandUpperBound: 12,
  planRiskColumnPriority: "new",
  includeNotesInEmail: false,
};
