/** Options shared by every official-PDF filler in this folder. */

export interface FillOptions {
  /**
   * PNG (or JPEG) data URLs, drawn into the corresponding signature box.
   * `undefined` falls back to the signature held in the form state; `null`
   * draws nothing even when the state holds one.
   */
  signatures?: { client1?: string | null; client2?: string | null; advisor?: string | null };
  /** Signing dates as text, e.g. "2026-09-25". Override the dates held in the state. */
  dates?: { client1?: string; client2?: string; advisor?: string };
  /** Flatten the form so the result can't be edited (use for final signed copies). */
  flatten?: boolean;
}
