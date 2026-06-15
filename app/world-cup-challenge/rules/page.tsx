import type { Metadata } from "next";
import { SCORING, POOL_DISCLAIMER, EVENT } from "@/lib/world-cup/config";
import { Card, Alert, Badge } from "@/components/world-cup/ui";
import { Maple } from "@/components/world-cup/icons";

export const metadata: Metadata = { title: "Rules & Scoring" };

function ScoreRow({ label, points }: { label: string; points: string }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <Badge tone="red">{points}</Badge>
    </li>
  );
}

export default function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-[#0B1F3A] sm:text-4xl">Rules &amp; Scoring</h1>
        <p className="mt-2 text-gray-600">
          Everything you need to know to play the {EVENT.shortTitle}.
        </p>
      </header>

      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-bold text-[#0B1F3A]">General rules</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
            <li>Predictions must be submitted before the match start time.</li>
            <li>Scores entered after match start cannot be changed by participants.</li>
            <li>Points are calculated based on official match results entered by an admin.</li>
            <li>The pool and prize structure are subject to internal review and approval.</li>
            <li>The platform does not process payments or distribute payouts.</li>
            <li>Organizers may adjust rules if required for fairness or compliance.</li>
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-[#0B1F3A]">Match prediction scoring</h2>
          <p className="mt-1 text-sm text-gray-500">Predict the final score of each match.</p>
          <ul className="mt-3">
            <ScoreRow label="Correct exact score" points={`${SCORING.match.exactScore} pts`} />
            <ScoreRow label="Correct result only (winner or draw)" points={`${SCORING.match.correctResult} pts`} />
            <ScoreRow label="Correct goal difference (bonus)" points={`+${SCORING.match.goalDifferenceBonus} pts`} />
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            An exact-score prediction is worth {SCORING.match.exactScore} points total — the goal-difference
            bonus is not added on top of an exact score.
          </p>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0B1F3A]">
            <Maple className="h-5 w-5 text-[#C8102E]" /> Canada Pride Challenge scoring
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Predict Team Canada’s three group-stage games and goal totals.
          </p>
          <ul className="mt-3">
            <ScoreRow label="Correct Canada result for each group game" points={`${SCORING.canada.resultPerGame} pts`} />
            <ScoreRow label="Correct Canada score for each game (bonus)" points={`${SCORING.canada.canadaScorePerGame} pts`} />
            <ScoreRow label="Correct opponent score for each game (bonus)" points={`${SCORING.canada.opponentScorePerGame} pts`} />
            <ScoreRow label="Correct total Canada goals scored (3 games)" points={`${SCORING.canada.totalScored} pts`} />
            <ScoreRow label="Correct total Canada goals conceded (3 games)" points={`${SCORING.canada.totalConceded} pts`} />
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-[#0B1F3A]">Final prediction scoring</h2>
          <p className="mt-1 text-sm text-gray-500">Predict the two finalists and the champion.</p>
          <ul className="mt-3">
            <ScoreRow label="Correct one finalist" points={`${SCORING.final.oneFinalist} pts`} />
            <ScoreRow label="Correct both finalists" points={`${SCORING.final.bothFinalists} pts`} />
            <ScoreRow label="Correct champion" points={`${SCORING.final.champion} pts`} />
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-[#0B1F3A]">Prediction locking</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
            <li>Match predictions can be edited until the match start time, then lock automatically.</li>
            <li>The Canada Pride Challenge and Final Prediction lock on admin-configured dates.</li>
          </ul>
        </Card>

        <Alert tone="warning" title="Pool & prize approval">
          {POOL_DISCLAIMER}
        </Alert>
      </div>
    </div>
  );
}
