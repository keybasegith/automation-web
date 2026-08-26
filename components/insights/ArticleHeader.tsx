import Image from "next/image";
import type { InsightArticle } from "@/lib/insights/types";
import ArticleByline from "./ArticleByline";

/**
 * The masthead of an article: category, headline, deck, attribution, dates, and
 * hero image.
 *
 * Every attribution line is conditional. A company announcement with no named
 * author and no reviewer renders a date and nothing else, rather than a row of
 * empty labels or a fallback byline nobody wrote.
 */
export default function ArticleHeader({ article }: { article: InsightArticle }) {
  const { heroImage } = article;
  // A series name above the headline where the piece has one; otherwise the
  // category it is filed under, which every article has.
  const eyebrow = article.eyebrow ?? article.category;

  return (
    <header>
      <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#006d6e]">
        {eyebrow}
      </p>
      <h1 className="mt-4 font-serif text-[36px] font-normal leading-[1.08] tracking-tight text-[#0a1f33] sm:text-[52px]">
        {article.title}
      </h1>
      <p className="mt-6 max-w-3xl text-xl leading-relaxed text-[#5b6573]">
        {article.deck ?? article.excerpt}
      </p>

      <div className="mt-8 border-t border-black/10 pt-6">
        <ArticleByline article={article} />
      </div>

      {heroImage && (
        <figure className="mt-10">
          <Image
            src={heroImage.src}
            alt={heroImage.alt}
            width={heroImage.width}
            height={heroImage.height}
            // Above the fold on every article page, so never lazy loaded.
            priority
            sizes="(min-width: 1024px) 800px, 100vw"
            className="h-auto w-full rounded-sm object-cover"
          />
        </figure>
      )}
    </header>
  );
}
