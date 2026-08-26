import Image from "next/image";
import type { PersonImage } from "@/lib/people/types";

/**
 * True for a portrait served from the CMS media origin.
 *
 * That origin is set by environment variable (NEXT_PUBLIC_MEDIA_BASE_URL), so
 * it cannot be listed in next.config's `images.remotePatterns` — and an
 * unlisted host makes next/image throw. Those are passed through unoptimized
 * instead, which skips the optimizer entirely rather than taking a public page
 * down over a replaced photograph. Portraits that ship with the repo are
 * optimized as usual.
 */
function isRemote(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * A person's portrait in a fixed-ratio frame.
 *
 * The frame is what keeps the page from shifting as the image loads: the box
 * reserves its space from its aspect ratio alone, which is why `fill` is used
 * rather than the image's own width and height. A portrait uploaded through the
 * CMS has no dimensions recorded for it, and this way that costs nothing —
 * every portrait, whatever its source or shape, is cropped to the same frame.
 */
export default function PersonPortrait({
  image,
  sizes,
  priority = false,
  ratio = "aspect-[4/5]",
  className = "",
}: {
  image: PersonImage;
  sizes: string;
  priority?: boolean;
  ratio?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#eef1f4] ${ratio} ${className}`}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={isRemote(image.src)}
        className={`object-cover object-top ${image.className ?? ""}`}
      />
    </div>
  );
}
