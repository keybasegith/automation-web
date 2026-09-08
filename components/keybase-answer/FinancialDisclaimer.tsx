/**
 * The disclaimer under every completed answer.
 *
 * The wording is fixed in lib/keybase-answer/config.ts and arrives on the
 * result itself, so an answer cannot be rendered without it and no component
 * can substitute its own. It sits alongside — never in place of — the corporate
 * disclosure the article pages carry.
 */
export default function FinancialDisclaimer({ text }: { text: string }) {
  return (
    <p className="border-t border-black/[0.08] pt-8 text-[13px] leading-relaxed text-[#8a93a0] sm:pt-10">
      {text}
    </p>
  );
}
