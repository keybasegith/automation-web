"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import AnswerError from "@/components/keybase-answer/AnswerError";
import FinancialAnswer from "@/components/keybase-answer/FinancialAnswer";
import FinancialQuestionInput from "@/components/keybase-answer/FinancialQuestionInput";
import GeneratingState from "@/components/keybase-answer/GeneratingState";
import InsufficientEvidence from "@/components/keybase-answer/InsufficientEvidence";
import KeybaseAnswerMark from "@/components/keybase-answer/KeybaseAnswerMark";
import RateLimitState from "@/components/keybase-answer/RateLimitState";
import SuggestedFinancialQuestions from "@/components/keybase-answer/SuggestedFinancialQuestions";
import type { SuggestedQuestion } from "@/config/keybase-answer";
import { trackClientEvent } from "@/lib/keybase-answer/client-analytics";
import { ANSWER_PAGE_COPY } from "@/lib/keybase-answer/copy";
import type {
  AnswerStage,
  AnswerStreamEvent,
  KeybaseAnswerResult,
} from "@/lib/keybase-answer/types";

/**
 * The Keybase Answer research surface.
 *
 * One question at a time. There is no transcript, no thread, and nothing kept
 * between questions — asking a new one replaces what is on screen rather than
 * appending to it, which is what makes this a research tool rather than a
 * conversation.
 *
 * The panel keeps its own width and padding across every state, so moving from
 * the prompts to a generating state to a finished answer never reflows the page
 * around it.
 *
 * Answers are shareable through `?q=`: the address bar carries the question,
 * nothing else. No session, no response id, no identifier of any kind — the
 * link asks the question again for whoever opens it.
 */

type View = "idle" | "working" | "answer" | "error" | "rate_limited";

interface ShellProps {
  suggested: SuggestedQuestion[];
  maxQuestionLength: number;
  /** A question from `?q=`, asked automatically on arrival. */
  initialQuestion?: string;
}

export default function KeybaseAnswerShell({
  suggested,
  maxQuestionLength,
  initialQuestion,
}: ShellProps) {
  const [view, setView] = useState<View>("idle");
  const [question, setQuestion] = useState("");
  const [stage, setStage] = useState<AnswerStage | null>(null);
  const [result, setResult] = useState<KeybaseAnswerResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackClientEvent("keybase_answer_view");
  }, []);

  /** Keep `?q=` in step without a navigation — the page is already here. */
  const syncUrl = useCallback((value: string | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const ask = useCallback(
    async (asked: string, source: "custom" | "suggested" | "related") => {
      const trimmed = asked.trim();
      if (!trimmed) return;

      // A second question replaces the first rather than racing it.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setQuestion(trimmed);
      setResult(null);
      setErrorMessage(undefined);
      setStage(null);
      setView("working");
      syncUrl(trimmed);
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      try {
        const response = await fetch("/api/keybase-answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: trimmed, source }),
          signal: controller.signal,
        });

        // Everything that fails before the stream starts comes back as JSON.
        if (!response.ok || !response.body) {
          const payload = (await response.json().catch(() => null)) as {
            error?: { code?: string; message?: string };
          } | null;
          if (response.status === 429) {
            trackClientEvent("keybase_answer_rate_limit");
            setView("rate_limited");
            return;
          }
          setErrorMessage(payload?.error?.message);
          setView("error");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handle = (line: string) => {
          if (!line.trim()) return;
          let event: AnswerStreamEvent;
          try {
            event = JSON.parse(line) as AnswerStreamEvent;
          } catch {
            return;
          }
          if (event.type === "stage") {
            setStage(event.stage);
          } else if (event.type === "result") {
            setResult(event.result);
            setView("answer");
            trackClientEvent(
              event.result.status === "insufficient_evidence"
                ? "keybase_answer_insufficient_evidence"
                : "keybase_answer_generated",
              {
                status: event.result.status,
                category: event.result.category,
                cached: event.result.cached,
                questionHash: event.result.questionHash,
              },
            );
          } else if (event.type === "error") {
            if (event.code === "rate_limited") {
              setView("rate_limited");
            } else {
              trackClientEvent("keybase_answer_error", { status: event.code });
              setErrorMessage(event.message);
              setView("error");
            }
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            handle(buffer.slice(0, newline));
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");
          }
        }
        handle(buffer);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[keybase-answer] request failed", err);
        trackClientEvent("keybase_answer_error", { status: "network" });
        setView("error");
      }
    },
    [syncUrl],
  );

  // A shared link asks its question once, on arrival.
  const initial = useRef(initialQuestion);
  useEffect(() => {
    const first = initial.current;
    if (first) {
      initial.current = undefined;
      void ask(first, "custom");
    }
  }, [ask]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    trackClientEvent("keybase_answer_new_question");
    setView("idle");
    setResult(null);
    setQuestion("");
    setStage(null);
    setErrorMessage(undefined);
    syncUrl(null);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [syncUrl]);

  const busy = view === "working";

  return (
    <div
      ref={panelRef}
      className="mx-auto w-full max-w-[1380px] rounded-[28px] border border-white/70 bg-white/72 px-5 py-12 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_24px_64px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:rounded-[40px] sm:px-10 sm:py-16 lg:px-20 lg:py-24"
    >
      {view === "idle" && (
        <div className="ka-reveal">
          {/* ---------- Masthead ---------- */}
          <div className="mx-auto max-w-[46rem] text-center">
            <span className="inline-flex text-[#006d6e]">
              <KeybaseAnswerMark size={44} />
            </span>
            <p className="mt-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]">
              {ANSWER_PAGE_COPY.title}
            </p>
            <h1 className="mx-auto mt-7 max-w-[30rem] font-serif text-[30px] font-normal leading-[1.18] tracking-tight text-[#0a1f33] sm:max-w-[34rem] sm:text-[40px] lg:text-[46px]">
              {ANSWER_PAGE_COPY.intro}
            </h1>
          </div>

          {/* ---------- Curated prompts ---------- */}
          <div className="mx-auto mt-12 max-w-[62rem] sm:mt-16">
            <SuggestedFinancialQuestions
              questions={suggested}
              disabled={busy}
              onSelect={(item) => {
                trackClientEvent("keybase_answer_suggested_question", {
                  category: item.category,
                  sourceId: item.id,
                });
                void ask(item.question, "suggested");
              }}
            />
          </div>

          {/* ---------- Ask your own ---------- */}
          <div className="mx-auto mt-12 max-w-[46rem] sm:mt-16">
            <p className="text-center text-[15px] leading-relaxed text-[#5b6573] sm:text-[16px]">
              {ANSWER_PAGE_COPY.supporting}
            </p>
            <div className="mt-7">
              <FinancialQuestionInput
                onSubmit={(value) => void ask(value, "custom")}
                disabled={busy}
                maxLength={maxQuestionLength}
              />
            </div>
            <p className="mt-6 text-center text-[13.5px] text-[#8a93a0]">
              {ANSWER_PAGE_COPY.helpPrefix}{" "}
              <Link
                href={ANSWER_PAGE_COPY.helpHref}
                className="font-medium text-[#006d6e] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e]"
              >
                {ANSWER_PAGE_COPY.helpLinkLabel}
              </Link>
            </p>
          </div>
        </div>
      )}

      {view === "working" && (
        <div>
          <h1 className="max-w-[46rem] font-serif text-[30px] font-normal leading-[1.16] tracking-tight text-[#0a1f33] sm:text-[40px] lg:text-[44px]">
            {question}
          </h1>
          <GeneratingState stage={stage} />
        </div>
      )}

      {view === "answer" && result && (
        <>
          {result.status === "insufficient_evidence" ? (
            <InsufficientEvidence result={result} onReset={reset} />
          ) : (
            <FinancialAnswer
              result={result}
              onReset={reset}
              busy={busy}
              onAskRelated={(value) => void ask(value, "related")}
            />
          )}
        </>
      )}

      {view === "rate_limited" && <RateLimitState onReset={reset} />}

      {view === "error" && (
        <AnswerError
          message={errorMessage}
          onRetry={() => void ask(question, "custom")}
          onReset={reset}
        />
      )}
    </div>
  );
}
