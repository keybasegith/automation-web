/**
 * Pre-generate answers for the curated prompts.
 *
 *   npm run keybase-answer:warm
 *   npm run keybase-answer:warm -- --visible-only
 *
 * The four prompts on the landing page should answer the moment they are
 * clicked. This runs each configured question through the real pipeline —
 * retrieval, evidence, generation, citation validation — and leaves the
 * validated result in the answer cache.
 *
 * Every configured prompt is warmed by default, not only the four showing
 * right now: the displayed set rotates daily, so warming today's four alone
 * would leave tomorrow's cold. `--visible-only` warms just today's and
 * tomorrow's, which is the cheap option when the corpus has barely moved.
 *
 * It uses the same code path a visitor does, deliberately. A warm cache filled
 * by a shortcut would be a cache of answers nobody has checked; here, anything
 * that would fail for a visitor fails here first, where somebody is watching.
 *
 * Run it after `keybase-answer:index`: a new index version invalidates every
 * cached answer, so warming before indexing warms a cache that is about to be
 * thrown away.
 */

import { warmableQuestions, SUGGESTED_QUESTION_COUNT } from "@/config/keybase-answer";
import { answerFinancialQuestion } from "@/lib/keybase-answer/answer-service";
import { newRequestId } from "@/lib/keybase-answer/analytics";
import { getConfig } from "@/lib/keybase-answer/config";
import { closePool, isConfigured } from "@/lib/keybase-answer/db";

const VISIBLE_ONLY = process.argv.includes("--visible-only");

async function main(): Promise<void> {
  if (!isConfigured()) {
    console.error(
      "DATABASE_URL is not set. Warming writes to the answer cache in Postgres.",
    );
    process.exitCode = 1;
    return;
  }

  const config = getConfig();
  const all = warmableQuestions();
  // Today's four and tomorrow's four lead the list, so this slice is exactly
  // the prompts a visitor can click between now and the next rotation.
  const questions = VISIBLE_ONLY ? all.slice(0, SUGGESTED_QUESTION_COUNT * 2) : all;

  console.log("KEYBASE ANSWER WARM");
  console.log("------------------------------");
  console.log(`Model: ${config.model}`);
  console.log(
    `Questions: ${questions.length}${VISIBLE_ONLY ? " (currently displayed)" : " (all configured)"}`,
  );
  console.log("");

  let warmed = 0;
  let failed = 0;

  for (const item of questions) {
    const started = Date.now();
    try {
      const result = await answerFinancialQuestion({
        question: item.question,
        requestId: newRequestId(),
      });
      const elapsed = Date.now() - started;
      // A prompt the index cannot answer is not a warm cache entry; it is a
      // curated prompt that will greet a visitor with an empty state.
      const answerable =
        result.status === "success" || result.status === "restricted";
      const detail = answerable
        ? `${result.sections.length} sections, ${result.sources.length} sources`
        : result.status;
      console.log(
        `  ${answerable ? "ok    " : "EMPTY "}${item.id.padEnd(28)} ${String(elapsed).padStart(6)}ms  ${detail}`,
      );
      if (answerable) warmed += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      console.log(
        `  FAIL  ${item.id.padEnd(28)} ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log("");
  console.log(`Warmed: ${warmed}`);
  console.log(`Not answerable or failed: ${failed}`);
  if (failed > 0) {
    console.log(
      "\nA prompt that cannot be answered is a prompt the index does not cover.\n" +
        "Either publish content for it or disable it in config/keybase-answer.ts.",
    );
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("\nWarming failed:", err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
