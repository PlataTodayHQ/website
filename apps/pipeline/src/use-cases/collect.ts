import type { IScraper, IFullTextExtractor } from "../ports/scraper.js";
import type { IRawArticleRepository } from "../ports/raw-article-repository.js";
import type { IImageStorage } from "../ports/image-storage.js";
import { log } from "@plata-today/shared";

const IMAGE_BATCH_SIZE = 5;
const MAX_CONCURRENT_EXTRACTIONS = 5;

export async function collectNews(
  scraper: IScraper,
  rawArticleRepo: IRawArticleRepository,
  extractor: IFullTextExtractor,
  imageStorage: IImageStorage,
): Promise<{ scraped: number; inserted: number; enriched: number }> {
  // Stage 1: Scrape
  const items = await scraper.scrapeAll();
  log.info("Scraping done", { items: items.length });

  // Stage 2: Ingest (download images + insert)
  const inserted = await ingest(rawArticleRepo, imageStorage, items);
  log.info("Ingestion done", { inserted, skipped: items.length - inserted });

  // Stage 3: Enrich with full-text
  const enriched = await enrich(rawArticleRepo, extractor);
  log.info("Enrichment done", { enriched });

  return { scraped: items.length, inserted, enriched };
}

async function ingest(
  rawArticleRepo: IRawArticleRepository,
  imageStorage: IImageStorage,
  items: Array<{
    title: string; link: string; description: string;
    pubDate: string | null; imageUrl: string | null;
    sourceName: string; category: string | null;
  }>,
): Promise<number> {
  // Build source name → ID cache
  const sourceCache = new Map<string, number>();
  for (const s of rawArticleRepo.getAllSources()) {
    sourceCache.set(s.name, s.id);
  }

  // Download images in batches
  const imageResults: Array<{ localPath: string | null; source: string | null }> = [];
  for (let i = 0; i < items.length; i += IMAGE_BATCH_SIZE) {
    const batch = items.slice(i, i + IMAGE_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        if (!item.imageUrl) return { localPath: null, source: null };
        const localPath = await imageStorage.download(item.imageUrl);
        return { localPath, source: localPath ? item.sourceName : null };
      }),
    );
    imageResults.push(...batchResults);
  }

  // Insert in transaction
  let inserted = 0;
  rawArticleRepo.runInTransaction(() => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const image = imageResults[i];

      const sourceId = sourceCache.get(item.sourceName);
      if (!sourceId) {
        log.debug("Source not in DB, skipping", { source: item.sourceName });
        continue;
      }

      const imageUrl = image.localPath ?? item.imageUrl;
      const wasInserted = rawArticleRepo.insert({
        sourceId,
        url: item.link,
        title: item.title,
        body: item.description,
        category: item.category,
        imageUrl,
        imageSource: image.source,
        publishedAt: item.pubDate,
      });

      if (wasInserted) inserted++;
    }
  });

  return inserted;
}

async function enrich(
  rawArticleRepo: IRawArticleRepository,
  extractor: IFullTextExtractor,
): Promise<number> {
  const articles = rawArticleRepo.getNeedingFullText();
  if (articles.length === 0) return 0;

  log.info("Articles needing full-text", { count: articles.length });
  let enriched = 0;

  for (let i = 0; i < articles.length; i += MAX_CONCURRENT_EXTRACTIONS) {
    const batch = articles.slice(i, i + MAX_CONCURRENT_EXTRACTIONS);
    const results = await Promise.allSettled(
      batch.map(async (article) => {
        const extracted = await extractor.extract(article.original_url);
        if (extracted && extracted.content.length >= 100) {
          rawArticleRepo.updateBody(article.id, extracted.content);
          return true;
        }
        return false;
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) enriched++;
    }
  }

  return enriched;
}
