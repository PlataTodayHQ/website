import type Database from "better-sqlite3";
import type { Queries } from "../db/queries.js";
import type { ScrapedItem } from "./index.js";
import { downloadImage } from "./images.js";
import { log } from "../logger.js";

export async function ingestArticles(
  db: Database.Database,
  queries: Queries,
  items: ScrapedItem[],
): Promise<number> {
  let inserted = 0;

  // Cache source lookups
  const sourceCache = new Map<string, number>();
  const allSources = queries.getAllSources.all() as Array<{
    id: number;
    name: string;
  }>;
  for (const s of allSources) {
    sourceCache.set(s.name, s.id);
  }

  // Download images in parallel before DB transaction
  const imageResults = await Promise.all(
    items.map(async (item) => {
      if (!item.imageUrl) return { localPath: null, source: null };
      const localPath = await downloadImage(item.imageUrl);
      return {
        localPath,
        source: localPath ? item.sourceName : null,
      };
    }),
  );

  const doIngest = db.transaction(() => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const image = imageResults[i];

      const sourceId = sourceCache.get(item.sourceName);
      if (!sourceId) {
        log.debug("Source not in DB, skipping", { source: item.sourceName });
        continue;
      }

      // Use downloaded local path, fall back to original URL
      const imageUrl = image.localPath ?? item.imageUrl;
      const imageSource = image.source;

      const result = queries.insertRawArticle.run(
        sourceId,
        item.link,
        item.title,
        item.description,
        item.category,
        imageUrl,
        imageSource,
        item.pubDate,
      );

      if (result.changes > 0) inserted++;
    }
  });

  doIngest();
  return inserted;
}
