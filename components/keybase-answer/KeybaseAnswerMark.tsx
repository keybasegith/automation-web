/**
 * The Keybase Answer symbol.
 *
 * Many separate points of financial knowledge, drawn at different weights and
 * distances, converging on a centre that is left open — the answer is what the
 * sources form around, not a thing the mark asserts on its own. Original to
 * Keybase, drawn in the house teal, and rendered as inline SVG so it inherits
 * colour and scales with the type around it.
 */

export default function KeybaseAnswerMark({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Keybase Answer"
      className={className}
    >
      {/* The open centre. */}
      <circle cx="24" cy="24" r="6.5" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />

      {/* Converging strokes — knowledge moving inward, stopping short. */}
      <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" opacity="0.45">
        <path d="M24 3.5v11" />
        <path d="M24 33.5v11" />
        <path d="M3.5 24h11" />
        <path d="M33.5 24h11" />
        <path d="M9.6 9.6l7.8 7.8" />
        <path d="M30.6 30.6l7.8 7.8" />
        <path d="M38.4 9.6l-7.8 7.8" />
        <path d="M17.4 30.6l-7.8 7.8" />
      </g>

      {/* The data points themselves, deliberately uneven — sources differ in
          weight, and a perfectly regular ring would say the opposite. */}
      <g fill="currentColor">
        <circle cx="24" cy="4" r="2.6" />
        <circle cx="41.1" cy="14" r="1.7" opacity="0.75" />
        <circle cx="41.1" cy="34" r="2.2" opacity="0.55" />
        <circle cx="24" cy="44" r="1.6" opacity="0.7" />
        <circle cx="6.9" cy="34" r="2.4" opacity="0.85" />
        <circle cx="6.9" cy="14" r="1.5" opacity="0.6" />
      </g>
    </svg>
  );
}
