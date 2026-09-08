"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Silent product film. Plays only in view and respects reduced motion. */
export default function KeybaseAnswerDemo() {
  const video = useRef<HTMLVideoElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      if (visible && !preference.matches && !userPaused.current) {
        void element.play().catch(() => {});
      } else {
        element.pause();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.25 });
    observer.observe(element);
    preference.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", sync);
      element.pause();
    };
  }, []);

  function togglePlayback() {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      userPaused.current = false;
      void element.play().catch(() => {});
    } else {
      userPaused.current = true;
      element.pause();
    }
  }

  return (
    <figure className="min-w-0">
      <video
        ref={video}
        src="/keybase-answer-demo.mp4?v=2"
        poster="/keybase-answer-demo-poster.jpg"
        width={1200}
        height={960}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label="How to use Keybase Answer"
        aria-describedby="keybase-demo-description"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="block h-auto w-full"
      />
      <figcaption className="mt-2 flex items-center justify-end gap-4 px-[4.8%] text-[12px] text-[#687176]">
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? "Pause feature video" : "Play feature video"}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-[#0a1f33] transition-colors hover:text-[#006d6e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006d6e]"
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </button>
      </figcaption>
      <p id="keybase-demo-description" className="sr-only">
        Illustrative walkthrough: enter “What is driving inflation in Canada?”
        and select the arrow. Keybase reviews its published commentary and
        prepares an answer. The answer appears with a source titled “Canada’s
        Inflation Rate Is Back at 3%. What Actually Matters?” to explore for
        full context. This silent video repeats and can be paused.
      </p>
    </figure>
  );
}
