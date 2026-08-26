import { Fragment } from "react";

/**
 * The one piece of inline markup article copy is allowed: `**bold**`.
 *
 * Article bodies are structured blocks, not markdown, so there is no parser to
 * lean on — but financial copy leans hard on emphasising the figure in a
 * sentence, and printing the asterisks would be worse than not supporting them
 * at all. Splitting on the delimiter covers that one case without pulling a
 * markdown pipeline into the render path; an unpaired `**` is left as text
 * rather than swallowing the rest of the sentence.
 */
export default function RichText({ text }: { text: string }) {
  const parts = text.split("**");
  // An odd number of delimiters means one is unpaired — render verbatim.
  if (parts.length % 2 === 0) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-[#0a1f33]">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
