"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Canvas signature capture with a typed-name fallback.
 *
 * Both modes produce the same thing — a PNG data URL — so storage and printing
 * never need to care which was used. Nothing is ever drawn on the client's
 * behalf: the field stays empty until someone signs or types a name.
 *
 * The committed value is written on pointer-up (and on a pause in typing),
 * not on every stroke, so a long signature does not re-encode the bitmap
 * dozens of times.
 */

type Mode = "draw" | "type";

const CANVAS_HEIGHT = 150;

export default function SignatureField({
  id,
  label,
  value,
  onChange,
  invalid = false,
  error,
  helperText = "Sign with your mouse, finger, or stylus.",
}: {
  id: string;
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  invalid?: boolean;
  error?: string;
  helperText?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);
  const valueRef = useRef<string | null>(value);
  const modeGroupId = useId();

  const [mode, setMode] = useState<Mode>("draw");
  const [typedName, setTypedName] = useState("");

  // Kept in a ref so the resize handler below can redraw the committed
  // signature without re-subscribing the observer on every change.
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  /** Resets the backing store for the current CSS size and DPR. */
  const prepareContext = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return null;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    return ctx;
  }, []);

  // Size the canvas on mount, and again whenever its box changes. A resize
  // clears the backing store, so anything already signed is redrawn from the
  // committed data URL rather than lost.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const redraw = () => {
      const ctx = prepareContext();
      if (!ctx) return;
      const committed = valueRef.current;
      if (!committed) return;
      const rect = canvas.getBoundingClientRect();
      const img = new window.Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = committed;
      hasInkRef.current = true;
    };

    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [prepareContext]);

  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasInkRef.current) return;
    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const clear = () => {
    prepareContext();
    hasInkRef.current = false;
    setTypedName("");
    onChange(null);
  };

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    // Keeps a touch drag on the pad from scrolling the questionnaire.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = pointFrom(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const next = pointFrom(e);
    const last = lastPointRef.current ?? next;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    lastPointRef.current = next;
    hasInkRef.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    commit();
  };

  /** Renders the typed name onto the same canvas so both modes agree. */
  const renderTypedName = useCallback(
    (name: string) => {
      const canvas = canvasRef.current;
      const ctx = prepareContext();
      if (!canvas || !ctx) return;
      const trimmed = name.trim();
      if (!trimmed) {
        hasInkRef.current = false;
        onChange(null);
        return;
      }
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `italic 42px "Snell Roundhand", "Apple Chancery", "Segoe Script", cursive`;
      ctx.fillText(trimmed, rect.width / 2, rect.height / 2, rect.width - 32);
      hasInkRef.current = true;
      onChange(canvas.toDataURL("image/png"));
    },
    [onChange, prepareContext],
  );

  // Commit the typed name once typing pauses, rather than per keystroke.
  useEffect(() => {
    if (mode !== "type") return;
    const timer = setTimeout(() => renderTypedName(typedName), 350);
    return () => clearTimeout(timer);
  }, [mode, typedName, renderTypedName]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    prepareContext();
    hasInkRef.current = false;
    setTypedName("");
    onChange(null);
  };

  const errorId = `${id}-error`;
  const typedInputId = `${id}-typed`;

  return (
    <div id={id} className="scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="text-[14px] font-semibold text-[#111111]">{label}</span>
        <div
          role="radiogroup"
          aria-label={`${label} — capture method`}
          className="crq-no-print flex items-center gap-1 rounded-[5px] border border-slate-200 bg-slate-50 p-0.5"
        >
          {(["draw", "type"] as const).map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-[4px] px-2.5 py-1 text-[13px] font-medium transition has-[input:checked]:bg-[#0B6165] has-[input:checked]:text-white ${
                mode === option ? "" : "text-slate-600 hover:bg-white"
              }`}
            >
              <input
                type="radio"
                name={modeGroupId}
                className="sr-only"
                checked={mode === option}
                onChange={() => switchMode(option)}
              />
              {option === "draw" ? "Draw" : "Type"}
            </label>
          ))}
        </div>
      </div>

      <div
        className={`crq-no-print mt-1.5 rounded-[5px] border bg-white p-1.5 ${
          invalid ? "border-red-500" : "border-slate-300"
        }`}
      >
        <canvas
          ref={canvasRef}
          aria-label={`${label} — signature pad`}
          aria-invalid={invalid || undefined}
          aria-describedby={error ? errorId : undefined}
          style={{ height: CANVAS_HEIGHT }}
          className={`block w-full touch-none rounded-[4px] bg-white ${
            mode === "draw" ? "cursor-crosshair" : "cursor-default"
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* Printed instead of the canvas: an exact copy of what was captured,
          or an empty rule where the field is still to be signed by hand. */}
      {!value && (
        <div
          aria-hidden
          className="crq-print-only hidden h-9 w-full max-w-[420px] border-b border-[#111111]"
        />
      )}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt={`${label} (captured)`}
          className="crq-print-only hidden w-full max-w-[420px] border-b border-[#111111]"
        />
      )}

      {mode === "type" && (
        <div className="crq-no-print mt-2 flex flex-col gap-1">
          <label htmlFor={typedInputId} className="text-[13px] font-medium text-slate-600">
            Type your full name to sign
          </label>
          <input
            id={typedInputId}
            type="text"
            value={typedName}
            autoComplete="off"
            onChange={(e) => setTypedName(e.target.value)}
            onBlur={() => renderTypedName(typedName)}
            className="h-10 w-full max-w-sm rounded-[4px] border border-slate-300 bg-white px-3 text-[16px] text-[#111111] outline-none transition focus-visible:border-[#0B6165] focus-visible:ring-2 focus-visible:ring-[#0B6165]/35"
          />
        </div>
      )}

      <div className="crq-no-print mt-2 flex items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">
          {mode === "draw" ? helperText : "Your typed name is rendered as your signature."}
        </p>
        <button
          type="button"
          onClick={clear}
          className="inline-flex h-8 shrink-0 items-center rounded-[5px] border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Clear
        </button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="crq-no-print mt-1.5 text-[13px] font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
