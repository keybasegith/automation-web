/**
 * The ambient page background.
 *
 * Three enormous, heavily blurred fields of very pale Keybase colour, drifting
 * on cycles of half a minute and more. At that scale and that speed the eye
 * reads depth rather than movement — which is the point: the page should feel
 * alive without ever competing with what is written on it.
 *
 * No JavaScript. Two CSS keyframes shared with the homepage composition, both
 * pure transforms, both switched off under prefers-reduced-motion by the block
 * in app/globals.css that governs the rest of the site's motion.
 */
export default function KeybaseAnswerBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#f2f7f8] via-[#f7fafa] to-[#fbfcfc]" />
      <div className="ka-drift-a absolute -left-[18%] -top-[22%] h-[62vw] w-[62vw] rounded-full bg-[#5ed3c6]/22 blur-[110px]" />
      <div className="ka-drift-b absolute -right-[16%] top-[12%] h-[56vw] w-[56vw] rounded-full bg-[#006d6e]/12 blur-[120px]" />
      <div className="ka-drift-a absolute -bottom-[26%] left-[22%] h-[58vw] w-[58vw] rounded-full bg-[#0a1f33]/[0.07] blur-[130px] [animation-duration:52s]" />
    </div>
  );
}
