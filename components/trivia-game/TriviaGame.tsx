"use client";

import Image from "next/image";
import { useState } from "react";

type Question = {
  id: number;
  title: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: "The Cost of Waiting",
    prompt:
      "If two investors each invest $500/month earning 10% annual growth, but one starts investing 10 years earlier, approximately how much more could they end up with by retirement?",
    options: [
      "$25,000 more ($720,000 vs $745,000)",
      "$75,000 more ($720,000 vs $795,000)",
      "$150,000 more ($720,000 vs $870,000)",
      "$400,000+ more ($720,000 vs $1.1 Million+)",
    ],
    correctIndex: 3,
    explanation:
      "The earlier investor benefits from compound growth for much longer. Even though both contribute the same amount monthly, the extra years of growth create a massive difference in final wealth. Time is one of the most powerful advantages in investing.",
  },
  {
    id: 2,
    title: "The Power of Compounding",
    prompt:
      "At an assumed 10% annual growth rate, approximately how much could investing $1,000/month grow to after 30 years?",
    options: ["$120,000", "$250,000", "$750,000", "$1.5 Million"],
    correctIndex: 2,
    explanation:
      "Most people underestimate how powerful compounding becomes over decades. Long-term investing is not just about contributions — it is about growth earning growth year after year.",
  },
  {
    id: 3,
    title: "Advisor Impact",
    prompt:
      "Some studies suggest that households working with a financial advisor for 15+ years accumulated approximately how many times more investable assets than households without an advisor?",
    options: [
      "1.5x more assets",
      "2.1x more assets",
      "3.9x more assets",
      "6.5x more assets",
    ],
    correctIndex: 2,
    explanation:
      "Good advisors often help investors stay disciplined, avoid emotional mistakes, maintain long-term plans, and invest consistently. Small improvements in behavior and planning can compound dramatically over time.",
  },
  {
    id: 4,
    title: "Real Estate vs Stocks",
    prompt:
      "Canadians love real estate, but over the long term, approximately what did $100,000 historically grow to after 25 years — Canadian housing vs the stock market?",
    options: [
      "~$430,000 vs ~$1.08 Million",
      "~$600,000 vs ~$700,000",
      "~$1 Million vs ~$1 Million",
      "~$1.5 Million vs ~$430,000",
    ],
    correctIndex: 0,
    explanation:
      "Many Canadians assume housing has been the best investment because they see prices rising. However, historically, stock markets have often compounded at higher long-term rates than housing before accounting for costs like maintenance, taxes, and transaction fees.",
  },
  {
    id: 5,
    title: "Patience Pays",
    prompt:
      "Which famous person said: \"The stock market is a device for transferring money from the impatient to the patient.\"",
    options: ["Elon Musk", "Warren Buffett", "Jeff Bezos", "Bill Gates"],
    correctIndex: 1,
    explanation:
      "One of Buffett's biggest lessons is that long-term patience often beats trying to constantly trade or predict short-term market moves. Historically, disciplined long-term investors have often been rewarded.",
  },
  {
    id: 6,
    title: "Inflation vs Investing",
    prompt:
      "If inflation averages 3%, approximately how long until prices double?",
    options: ["5 years", "12 years", "24 years", "50 years"],
    correctIndex: 2,
    explanation:
      "Inflation quietly reduces purchasing power over time. Something costing $100 today could cost around $200 in about 24 years at 3% inflation — which is why many investors feel pressure to grow their money faster than inflation.",
  },
  {
    id: 7,
    title: "The Average Investor Problem",
    prompt:
      "Historically, investors often underperform the stock market because of:",
    options: [
      "High taxes",
      "Emotional decisions",
      "Lack of diversification",
      "Market crashes alone",
    ],
    correctIndex: 1,
    explanation:
      "Fear and greed can lead investors to buy high during excitement and sell low during panic. Emotional decisions have historically been one of the biggest reasons investors underperform long-term market returns.",
  },
  {
    id: 8,
    title: "The TFSA Question",
    prompt:
      "If a TFSA investment grows from $50,000 to $500,000, how much tax is generally paid on the growth?",
    options: ["~$10,000", "~$50,000", "~$100,000", "$0"],
    correctIndex: 3,
    explanation:
      "One of the biggest advantages of a TFSA is that investment growth and withdrawals are generally tax-free. Many Canadians underestimate how valuable this becomes over decades of compounding.",
  },
  {
    id: 9,
    title: "Dividend Investors",
    prompt:
      "Historically, dividends have accounted for approximately what portion of long-term stock market returns?",
    options: ["Almost none", "About 10%", "Around 30–40%", "Over 90%"],
    correctIndex: 2,
    explanation:
      "Many investors focus only on stock price growth, but dividends have historically played a major role in total returns. Reinvested dividends can significantly increase long-term portfolio growth through compounding.",
  },
];

const LETTERS = ["A", "B", "C", "D"];

type Screen = "start" | "playing" | "finished";

export default function TriviaGame() {
  const [screen, setScreen] = useState<Screen>("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const total = QUESTIONS.length;
  const question = QUESTIONS[currentIndex];

  const start = () => {
    setScreen("playing");
    setCurrentIndex(0);
    setSelectedIndex(null);
    setRevealed(false);
    setScore(0);
    setAnswers([]);
  };

  const choose = (index: number) => {
    if (revealed) return;
    setSelectedIndex(index);
    setRevealed(true);
    const isCorrect = index === question.correctIndex;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((a) => [...a, isCorrect]);
  };

  const next = () => {
    if (currentIndex + 1 >= total) {
      setScreen("finished");
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedIndex(null);
    setRevealed(false);
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        {screen === "start" && <StartScreen onStart={start} />}
        {screen === "playing" && (
          <PlayingScreen
            question={question}
            index={currentIndex}
            total={total}
            selectedIndex={selectedIndex}
            revealed={revealed}
            onChoose={choose}
            onNext={next}
          />
        )}
        {screen === "finished" && (
          <FinishedScreen
            score={score}
            total={total}
            answers={answers}
            onRestart={start}
          />
        )}
      </div>
    </div>
  );
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Image
        src="/keybase-logo%20copy.png"
        alt="Keybase Financial Group"
        width={200}
        height={200}
        priority
        className="mb-8 h-20 w-20 rounded-2xl object-contain"
      />

      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-brand">
        Keybase Financial Group
      </p>

      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Finance Trivia Challenge
      </h1>

      <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-500">
        Nine questions on compounding, investing, and long-term wealth.
        Roughly three minutes.
      </p>

      <div className="mt-10 grid w-full max-w-sm grid-cols-3 gap-3 text-center">
        <Stat label="Questions" value="9" />
        <Stat label="Difficulty" value="Mixed" />
        <Stat label="Time" value="~3 min" />
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-10 w-full max-w-sm rounded-xl bg-brand px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover active:bg-brand-hover"
      >
        Start the challenge
      </button>

      <p className="mt-5 text-xs text-slate-400">
        Tap an answer when you&apos;re ready.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-3">
      <div className="text-base font-semibold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

function PlayingScreen({
  question,
  index,
  total,
  selectedIndex,
  revealed,
  onChoose,
  onNext,
}: {
  question: Question;
  index: number;
  total: number;
  selectedIndex: number | null;
  revealed: boolean;
  onChoose: (i: number) => void;
  onNext: () => void;
}) {
  const progress = ((index + (revealed ? 1 : 0)) / total) * 100;
  const isLast = index + 1 >= total;
  const wasCorrect = revealed && selectedIndex === question.correctIndex;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        <span>
          Question {index + 1} of {total}
        </span>
        <span className="text-slate-400">{question.title}</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h2 className="mt-8 text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-2xl">
        {question.prompt}
      </h2>

      <div className="mt-6 flex flex-col gap-2.5">
        {question.options.map((option, i) => {
          const isSelected = selectedIndex === i;
          const isCorrect = i === question.correctIndex;

          let stateClasses =
            "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:scale-[0.995]";
          let letterClasses = "bg-slate-100 text-slate-600";
          if (revealed) {
            if (isCorrect) {
              stateClasses = "border-brand bg-brand-soft";
              letterClasses = "bg-brand text-white";
            } else if (isSelected) {
              stateClasses = "border-rose-300 bg-rose-50";
              letterClasses = "bg-rose-500 text-white";
            } else {
              stateClasses = "border-slate-150 bg-white opacity-50";
            }
          }

          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => onChoose(i)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] leading-snug transition-all disabled:cursor-default sm:text-base ${stateClasses}`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${letterClasses}`}
              >
                {LETTERS[i]}
              </span>
              <span className="flex-1 text-slate-900">{option}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            wasCorrect
              ? "border-brand/30 bg-brand-soft"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {wasCorrect ? "Correct" : "Not quite"}
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700 sm:text-[15px]">
            {question.explanation}
          </p>
        </div>
      )}

      <div className="mt-auto pt-8">
        {revealed ? (
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-xl bg-brand px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            {isLast ? "See my score" : "Next question"}
          </button>
        ) : (
          <p className="text-center text-xs text-slate-400">
            Tap an answer to lock it in.
          </p>
        )}
      </div>
    </div>
  );
}

function FinishedScreen({
  score,
  total,
  answers,
  onRestart,
}: {
  score: number;
  total: number;
  answers: boolean[];
  onRestart: () => void;
}) {
  const percent = Math.round((score / total) * 100);
  const { title, message } = getResultCopy(score, total);

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <Image
        src="/keybase-logo%20copy.png"
        alt="Keybase Financial Group"
        width={200}
        height={200}
        className="mb-8 h-16 w-16 rounded-2xl object-contain"
      />

      <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-brand">
        Your result
      </p>

      <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h1>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-6 py-8">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
          You scored
        </div>
        <div className="mt-2 font-display text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
          {score}
          <span className="text-slate-300"> / {total}</span>
        </div>
        <div className="mt-1 text-sm font-medium text-slate-500">
          {percent}%
        </div>

        <div className="mt-6 flex justify-center gap-1.5">
          {answers.map((correct, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                correct ? "bg-brand" : "bg-rose-300"
              }`}
              title={`Q${i + 1}: ${correct ? "Correct" : "Wrong"}`}
            />
          ))}
        </div>
      </div>

      <p className="mt-6 max-w-sm whitespace-pre-line text-[15px] leading-relaxed text-slate-500">
        {message}
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="mt-10 w-full max-w-sm rounded-xl bg-brand px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
      >
        Play again
      </button>
    </div>
  );
}

function getResultCopy(score: number, total: number) {
  const ratio = score / total;
  if (ratio === 1) {
    return {
      title: "Legendary",
      message:
        "A perfect score. You clearly know your way around compounding, dividends, and long-term investing.",
    };
  }
  if (ratio >= 0.75) {
    return {
      title: "Sharp Investor",
      message:
        "Excellent result. You have a strong grasp of how time, patience, and discipline drive long-term wealth.",
    };
  }
  if (ratio >= 0.5) {
    return {
      title: "Solid Effort",
      message:
        "Nice work. You got the big ideas right — keep building on the fundamentals of compounding and patience.",
    };
  }
  if (ratio >= 0.25) {
    return {
      title: "Growing Knowledge",
      message:
        "Every expert started somewhere.\nThe most powerful lesson in investing is also the\nsimplest: start early, stay consistent.",
    };
  }
  return {
    title: "Time to Learn",
    message:
      "The best time to learn about investing was yesterday. The second best time is right now.",
  };
}
