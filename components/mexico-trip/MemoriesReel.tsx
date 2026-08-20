import Image from "next/image";
import { MEMORIES } from "@/lib/mexico-trip/config";
import { SectionHeading } from "./ui";

/**
 * "Memories Made" — photos from trips past, run as one continuous film reel.
 *
 * The track carries two identical copies of the list and slides left by
 * exactly half its width, so the moment the first copy leaves the frame the
 * second is sitting in register behind it and the loop never seams. Frames
 * keep their natural aspect at a fixed rail height, which is why the mix of
 * portrait and landscape shots reads as a reel rather than a grid.
 *
 * Server-rendered: there is no state here, only CSS motion.
 */
export function MemoriesReel() {
  return (
    <section
      className="overflow-hidden bg-[#F3F7FB] py-24 sm:py-32"
      aria-labelledby="memories-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          align="left"
          eyebrow="From trips past"
          title={<span id="memories-heading">Memories Made</span>}
          sub="Years of qualifiers, and the week they spent together at the end of each one."
        />
      </div>

      {/* Full-bleed rail — the reel runs past the page margins on both sides. */}
      <div className="reel relative mt-14 overflow-hidden">
        {/* Spacing lives on each frame, not as a flex `gap`: with a gap the
            track's half-width is one half-gap wider than a single copy, so
            the -50% travel would jump slightly on every cycle. */}
        <div className="reel-scroll flex w-max">
          {/* Two passes over the same photos: the first is the reel the reader
              sees, the second is the seam-filler the animation lands on. */}
          {[0, 1].map((pass) =>
            MEMORIES.map((photo) => (
              <div
                key={`${pass}-${photo.src}`}
                className="relative mr-4 shrink-0 overflow-hidden rounded-xl bg-[#E8F0F8] shadow-[0_10px_30px_-18px_rgba(11,34,55,0.55)] sm:mr-6"
              >
                <Image
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  // The second pass is decorative duplication — announcing it
                  // twice would just double the reel for a screen reader.
                  alt={pass === 0 ? "A moment from a past qualifiers trip" : ""}
                  aria-hidden={pass === 1 || undefined}
                  sizes="(max-width: 640px) 60vw, 30vw"
                  draggable={false}
                  className="h-[260px] w-auto max-w-none select-none object-cover sm:h-[340px]"
                />
              </div>
            )),
          )}
        </div>

        {/* Soft edges so frames enter and leave rather than getting clipped. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F3F7FB] to-transparent sm:w-28"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F3F7FB] to-transparent sm:w-28"
          aria-hidden
        />
      </div>
    </section>
  );
}
