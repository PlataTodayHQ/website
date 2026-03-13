import { loadConfig } from "./config.js";
import { openDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { createQueries } from "./db/queries.js";
import { scrapeAllFeeds } from "./scraper/index.js";
import { ingestArticles } from "./scraper/ingest.js";
import { enrichArticles } from "./scraper/enrich.js";
import { clusterArticles } from "./cluster/index.js";
import { updateEventScores } from "./cluster/scoring.js";
import { rewriteEvent } from "./rewriter/index.js";
import { triggerRebuild } from "./rebuild.js";
import { log, setLogLevel } from "./logger.js";

async function main(): Promise<void> {
  const startTime = Date.now();
  log.info("Pipeline started");

  const config = loadConfig();
  setLogLevel(config.logLevel);

  // Stage 0: Ensure DB schema is up to date
  runMigrations(config.databasePath);

  const db = openDatabase(config.databasePath);

  try {
    const queries = createQueries(db);

    // Stage 1: Scrape RSS feeds
    log.info("=== Stage 1: Scraping ===");
    const scrapedItems = await scrapeAllFeeds();
    log.info("Scraping done", { items: scrapedItems.length });

    // Stage 2: Ingest into raw_articles (downloads images)
    log.info("=== Stage 2: Ingesting ===");
    const inserted = await ingestArticles(db, queries, scrapedItems);
    log.info("Ingestion done", {
      inserted,
      skipped: scrapedItems.length - inserted,
    });

    // Stage 2.5: Enrich with full-text extraction
    log.info("=== Stage 2.5: Enriching ===");
    const enriched = await enrichArticles(db, queries);
    log.info("Enrichment done", { enriched });

    if (inserted === 0) {
      log.info("No new articles, skipping to rewrite check");
    }

    // Stage 3: Cluster articles into events
    log.info("=== Stage 3: Clustering ===");
    const { newClusters, clusteredArticles } = clusterArticles(db, queries);
    log.info("Clustering done", { newClusters, clusteredArticles });

    // Stage 4: Score events
    log.info("=== Stage 4: Scoring ===");
    updateEventScores(db, queries);

    // Stage 5: Rewrite via LLM API
    log.info("=== Stage 5: Rewriting ===");
    const events = queries.getUnpublishedEvents.all(
      config.minImportanceScore,
      config.maxEventsPerRun,
    ) as Array<{ id: number; category: string }>;

    let totalArticles = 0;
    for (const event of events) {
      const count = await rewriteEvent(config, db, queries, event);
      totalArticles += count;
    }
    log.info("Rewriting done", {
      events: events.length,
      articles: totalArticles,
    });

    // Stage 6: Rebuild static site
    if (totalArticles > 0) {
      log.info("=== Stage 6: Rebuilding ===");
      const rebuildCmd = process.env.ASTRO_REBUILD_COMMAND;
      if (rebuildCmd) {
        await triggerRebuild(rebuildCmd);
      } else {
        log.info("No ASTRO_REBUILD_COMMAND set, skipping rebuild");
      }
    }
  } finally {
    db.close();
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  log.info("Pipeline complete", { durationSec, timestamp: new Date().toISOString() });
}

main().catch((err) => {
  log.error("Pipeline fatal error", {
    error: String(err),
    stack: (err as Error)?.stack,
  });
  process.exit(1);
});
