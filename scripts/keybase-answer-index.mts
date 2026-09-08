/**
 * Build the Keybase Answer knowledge index.
 *
 *   npm run keybase-answer:index
 *   npm run keybase-answer:index -- --base-url=http://localhost:3000
 *
 * Reads the approved public content (see lib/keybase-answer/content-loader.ts
 * for what "approved" means and what is structurally excluded), cuts it into
 * semantic chunks, embeds anything that has changed, and replaces the index.
 *
 * Two things worth knowing before running it:
 *
 *   - Pass --base-url pointing at a running Keybase site to index the *rendered*
 *     service and company pages. Most of Keybase's financial education is
 *     written as React components, so without it those pages contribute only
 *     their CMS summary and answers about TFSAs and RRSPs will be thin.
 *
 *   - Documents whose content has not changed since the last run keep their
 *     existing vectors. Re-indexing after publishing one article costs one
 *     article's worth of embeddings, not the whole corpus.
 *
 * Nothing here scrapes the site per question. This runs on publish, and the
 * answer path only ever reads what it wrote.
 */

import {
  DEFAULT_CHUNK_OPTIONS,
  chunkSections,
} from "@/lib/keybase-answer/chunking";
import { getConfig } from "@/lib/keybase-answer/config";
import { loadApprovedDocuments } from "@/lib/keybase-answer/content-loader";
import { purgeSupersededAnswers } from "@/lib/keybase-answer/cache";
import { closePool, ensureSchema, isConfigured } from "@/lib/keybase-answer/db";
import { embedTexts, embeddingModelLabel } from "@/lib/keybase-answer/embeddings";
import {
  documentChecksum,
  getKnowledgeIndex,
  newIndexVersion,
  type IndexableDocument,
} from "@/lib/keybase-answer/index-store";
import { pruneRateLimitWindows } from "@/lib/keybase-answer/rate-limit";
import type { IndexRunReport } from "@/lib/keybase-answer/types";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function line(label: string, value: string | number): string {
  return `${label.padEnd(30)}${value}`;
}

async function main(): Promise<void> {
  const config = getConfig();
  const baseUrl = arg("base-url") ?? process.env.KEYBASE_ANSWER_INDEX_BASE_URL;
  const embeddingModel = embeddingModelLabel();
  const indexVersion = newIndexVersion();

  if (!isConfigured()) {
    console.error(
      "DATABASE_URL is not set. The knowledge index lives in Postgres; set it and try again.",
    );
    process.exitCode = 1;
    return;
  }

  // The application never creates its own tables, so the command does — which
  // is what makes this one step on a fresh database.
  await ensureSchema();

  const index = getKnowledgeIndex();
  await index.ensureReady();

  console.log("KEYBASE ANSWER INDEX");
  console.log("------------------------------");
  console.log("");
  if (!baseUrl) {
    console.log(
      "No --base-url given: indexing structured content only. Service and company\n" +
        "pages will contribute their CMS summary rather than their full copy.\n",
    );
  }

  const loaded = await loadApprovedDocuments({ baseUrl });
  const existing = await index.existingFingerprints();

  const report: IndexRunReport = {
    documentsDiscovered: loaded.discovered,
    documentsApproved: loaded.documents.length,
    documentsIndexed: 0,
    chunksGenerated: 0,
    embeddingsGenerated: 0,
    staleChunksRemoved: 0,
    skipped: loaded.skipped.length,
    errors: [],
    indexVersion,
  };

  const indexable: IndexableDocument[] = [];

  for (const { document, sections } of loaded.documents) {
    try {
      const chunks = chunkSections(sections, DEFAULT_CHUNK_OPTIONS);
      report.chunksGenerated += chunks.length;
      if (chunks.length === 0) {
        report.skipped += 1;
        continue;
      }

      const fingerprint = existing.get(document.id);
      const unchanged =
        fingerprint?.checksum === documentChecksum(document) &&
        fingerprint.embeddingModel === embeddingModel;

      if (unchanged) {
        // Nothing to re-embed. The write still runs, to move the document onto
        // the new index version so the prune below does not delete it.
        indexable.push({
          document,
          chunks: [],
        });
        report.documentsIndexed += 1;
        continue;
      }

      const { vectors } = await embedTexts(chunks.map((chunk) => chunk.text));
      report.embeddingsGenerated += vectors.length;
      indexable.push({
        document,
        chunks: chunks.map((chunk, i) => ({
          chunkIndex: i,
          heading: chunk.heading,
          text: chunk.text,
          embedding: vectors[i],
        })),
      });
      report.documentsIndexed += 1;
    } catch (err) {
      report.errors.push(
        `${document.canonicalUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const written = await index.write(indexable, { indexVersion, embeddingModel });
  report.staleChunksRemoved = written.staleChunksRemoved;

  // Publishing new content changes the index version, which already stops old
  // answers being read. This reclaims the rows they occupied.
  const purged = await purgeSupersededAnswers(indexVersion);
  await pruneRateLimitWindows();

  console.log(line("Public documents discovered:", report.documentsDiscovered));
  console.log(line("Approved documents:", report.documentsApproved));
  console.log(line("Documents indexed:", report.documentsIndexed));
  console.log(line("Chunks generated:", report.chunksGenerated));
  console.log(line("Embeddings generated:", report.embeddingsGenerated));
  console.log(line("Stale chunks removed:", report.staleChunksRemoved));
  console.log(line("Cached answers expired:", purged));
  console.log(line("Skipped:", report.skipped));
  console.log(line("Errors:", report.errors.length));
  console.log(line("Embedding model:", embeddingModel));
  console.log(line("Generation model:", config.model));
  console.log(line("Index version:", indexVersion));

  if (loaded.skipped.length > 0) {
    console.log("\nSkipped:");
    for (const item of loaded.skipped) {
      console.log(`  - ${item.reference}: ${item.reason}`);
    }
  }
  if (loaded.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of loaded.warnings) console.log(`  - ${warning}`);
  }
  if (report.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of report.errors) console.log(`  - ${error}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("\nIndexing failed:", err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
