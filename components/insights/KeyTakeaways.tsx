/**
 * Three to five factual points from the article, for readers who want the
 * substance before the argument — and for answer engines extracting a summary.
 *
 * Not a summary the author did not write: the points live in the article record
 * as editorial content, and a piece without them renders nothing here.
 */
export default function KeyTakeaways({ points }: { points: string[] }) {
  if (points.length === 0) return null;

  return (
    <aside
      aria-labelledby="key-takeaways"
      className="my-12 rounded-sm border-l-[3px] border-[#006d6e] bg-[#f7f9fa] px-7 py-7 sm:px-9"
    >
      <h2
        id="key-takeaways"
        className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#0a1f33]"
      >
        Key Takeaways
      </h2>
      <ul className="mt-5 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-[16px] leading-relaxed text-[#5b6573]">
            <span aria-hidden className="mt-[10px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#006d6e]" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
