import type Database from "better-sqlite3";
import type { Queries } from "../db/queries.js";
import { extractFullText } from "./extract.js";
import { log } from "../logger.js";

const MAX_CONCURRENT_EXTRACTIONS = 5;

export async function enrichArticles(
  db: Database.Database,
  queries: Queries,
): Promise<number> {
  const articles = queries.getArticlesNeedingFullText.all() as Array<{
    id: number;
    original_url: string;
  }>;

  if (articles.length === 0) return 0;

  log.info("Articles needing full-text", { count: articles.length });

  let enriched = 0;
  // Process in batches to limit concurrency
  for (let i = 0; i < articles.length; i += MAX_CONCURRENT_EXTRACTIONS) {
    const batch = articles.slice(i, i + MAX_CONCURRENT_EXTRACTIONS);

    const results = await Promise.allSettled(
      batch.map(async (article) => {
        const extracted = await extractFullText(article.original_url);
        if (extracted && extracted.content.length >= 100) {
          queries.updateRawArticleBody.run(extracted.content, article.id);
          return true;
        }
        return false;
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        enriched++;
      }
    }
  }

  return enriched;
}
