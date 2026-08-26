import type { ArticleBlock } from "@/lib/insights/types";
import { articleHeadings } from "@/lib/insights/articles";
import RichText from "./RichText";

/**
 * Renders an article body to semantic HTML, one element per block.
 *
 * Heading ids come from the same helper the table of contents uses, so the two
 * can never drift apart or produce a dead anchor. Headings carry only their real
 * level — h2 for sections, h3 for subsections — and nothing here uses a heading
 * to obtain a font size.
 */
export default function ArticleBody({ body }: { body: ArticleBlock[] }) {
  // Anchor id per heading block, keyed by its position in the body so nothing
  // has to be counted while rendering. Same source as the table of contents,
  // so the two can never disagree.
  const entries = articleHeadings(body);
  const headingIds = new Map(
    body
      .map((block, index) => (block.type === "heading" ? index : -1))
      .filter((index) => index >= 0)
      .map((blockIndex, n) => [blockIndex, entries[n].id] as const),
  );

  return (
    <div className="space-y-6">
      {body.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const id = headingIds.get(i);
            return block.level === 2 ? (
              <h2
                key={i}
                id={id}
                className="scroll-mt-28 pt-6 font-serif text-[30px] font-normal leading-[1.15] tracking-tight text-[#0a1f33] sm:text-[36px]"
              >
                {block.text}
              </h2>
            ) : (
              <h3
                key={i}
                id={id}
                className="scroll-mt-28 pt-2 font-serif text-[23px] font-normal leading-snug text-[#0a1f33] sm:text-[26px]"
              >
                {block.text}
              </h3>
            );
          }

          case "paragraph":
            return (
              <p key={i} className="text-[17px] leading-relaxed text-[#5b6573]">
                <RichText text={block.text} />
              </p>
            );

          case "list": {
            const items = block.items.map((item) => (
              <li key={item} className="text-[17px] leading-relaxed text-[#5b6573]">
                <RichText text={item} />
              </li>
            ));
            return block.ordered ? (
              <ol key={i} className="list-decimal space-y-2 pl-6 marker:text-[#9aa3ad]">
                {items}
              </ol>
            ) : (
              <ul key={i} className="list-disc space-y-2 pl-6 marker:text-[#9aa3ad]">
                {items}
              </ul>
            );
          }

          case "table":
            return (
              // The wrapper scrolls, not the page — a wide comparison table on a
              // phone must never push the article sideways.
              <figure key={i} className="my-4">
                <div className="overflow-x-auto rounded-sm border border-black/10">
                  <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
                    {block.caption && (
                      <caption className="px-5 py-3 text-left text-[14px] text-[#7a828d]">
                        {block.caption}
                      </caption>
                    )}
                    <thead>
                      <tr className="bg-[#f7f9fa]">
                        {block.columns.map((column) => (
                          <th
                            key={column}
                            scope="col"
                            className="border-b border-black/10 px-5 py-3.5 font-semibold text-[#0a1f33]"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={r} className="border-b border-black/5 last:border-b-0">
                          {row.map((cell, c) => (
                            <td key={c} className="px-5 py-3.5 leading-relaxed text-[#5b6573]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
            );

          case "callout":
            return (
              <div
                key={i}
                className="my-4 rounded-sm border-l-[3px] border-[#0a1f33]/25 bg-[#f7f9fa] px-6 py-5"
              >
                {block.title && (
                  <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#0a1f33]">
                    {block.title}
                  </p>
                )}
                <p className="mt-2 text-[16px] leading-relaxed text-[#5b6573] first:mt-0">
                  <RichText text={block.text} />
                </p>
              </div>
            );

          case "quote":
            return (
              <figure key={i} className="my-6 border-l-[3px] border-[#006d6e] pl-6">
                <blockquote className="font-serif text-[22px] font-normal italic leading-snug text-[#0a1f33]">
                  {block.text}
                </blockquote>
                {block.attribution && (
                  <figcaption className="mt-3 text-[15px] text-[#7a828d]">
                    {block.attribution}
                  </figcaption>
                )}
              </figure>
            );
        }
      })}
    </div>
  );
}
