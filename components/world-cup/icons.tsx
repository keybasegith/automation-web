// Small custom maple-leaf glyph (lucide has no maple icon).
export function Maple({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2l1.2 3.6 3-1.6-1 3.4 3.4-.4-2.3 2.6 3.2 1.4-3.2 1.4 2.3 2.6-3.4-.4 1 3.4-3-1.6L12 22l-1.2-3.6-3 1.6 1-3.4-3.4.4 2.3-2.6L2.2 13l3.2-1.4-2.3-2.6 3.4.4-1-3.4 3 1.6L12 2z" />
    </svg>
  );
}
