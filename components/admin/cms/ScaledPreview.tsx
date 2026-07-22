"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders its children at a fixed "real" width (default 1280px, the site's
 * layout width) and scales the whole thing down to fit the panel it's placed
 * in — so an admin sees a true-to-life miniature of the live page that updates
 * as they type. Uses a ResizeObserver (which fires on observe) so no state is
 * set synchronously inside the effect.
 */
export default function ScaledPreview({
  baseWidth = 1280,
  className,
  children,
}: {
  baseWidth?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const w = outer.clientWidth;
      const s = w / baseWidth;
      setScale(s);
      // offsetHeight is the pre-transform layout height; scale it for the box.
      setHeight(inner.offsetHeight * s);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [baseWidth]);

  return (
    <div ref={outerRef} className={className} style={{ height: height || undefined }}>
      <div
        ref={innerRef}
        style={{
          width: baseWidth,
          transform: scale ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
