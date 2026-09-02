/**
 * Persistence entry point.
 *
 * One implementation today — a local JSON store that needs no infrastructure.
 * Swapping in a database means satisfying `FinancialStore` and changing this
 * file, and nothing else.
 */

import { localStore } from "./store/localStore";
import type { FinancialStore } from "./store/types";

export const store: FinancialStore = localStore;
export type { FinancialStore, StatementVersion } from "./store/types";
