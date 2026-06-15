// Client-side scoring preview helpers. The authoritative scoring lives in the
// SQL function wc_recalculate_points(); these mirror it for display only
// (e.g. showing a participant the points they earned on a completed match).

import { SCORING } from "./config";
import type { Match, Prediction } from "./types";

export function matchResultLabel(home: number, away: number): string {
  if (home > away) return "Home win";
  if (home < away) return "Away win";
  return "Draw";
}

/** Points a prediction would earn against a completed match. Mirrors SQL. */
export function scoreMatchPrediction(
  prediction: Pick<Prediction, "predicted_home_score" | "predicted_away_score">,
  match: Pick<Match, "status" | "home_score" | "away_score">
): number {
  if (
    match.status !== "completed" ||
    match.home_score == null ||
    match.away_score == null
  ) {
    return 0;
  }
  const ph = prediction.predicted_home_score;
  const pa = prediction.predicted_away_score;
  const ah = match.home_score;
  const aa = match.away_score;

  if (ph === ah && pa === aa) return SCORING.match.exactScore;

  let pts = 0;
  if (Math.sign(ph - pa) === Math.sign(ah - aa)) pts += SCORING.match.correctResult;
  if (ph - pa === ah - aa) pts += SCORING.match.goalDifferenceBonus;
  return pts;
}
