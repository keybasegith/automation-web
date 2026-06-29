"use client";

import { useEffect, useRef, useState } from "react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Stagger offset in ms, applied as a transition-delay. */
  delay?: number;
  /** Fraction of the element that must be visible before it reveals. */
  threshold?: number;
};

/**
 * Reveals its children with a gentle fade-and-rise the first time they
 * scroll into view. Renders a plain <div>, so pass through any layout
 * classes (it can stand in for a grid cell, card, etc.). Falls back to
 * fully visible when IntersectionObserver is unavailable, and the CSS
 * collapses the effect entirely under prefers-reduced-motion.
 */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  threshold = 0.15,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      data-shown={shown}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${className}`}
    >
      {children}
    </div>
  );
}
