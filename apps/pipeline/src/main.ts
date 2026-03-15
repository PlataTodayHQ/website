import { loadConfig } from "./config.js";
import { openDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { SOURCES } from "./scraper/sources.js";
import { log, setLogLevel } from "@plata-today/shared";

// Infrastructure
import { SQLiteEventRepository } from "./infra/db/sqlite-event-repo.js";
import { SQLiteArticleRepository } from "./infra/db/sqlite-article-repo.js";
import { SQLiteRawArticleRepository } from "./infra/db/sqlite-raw-article-repo.js";
import { OpenAILLMService } from "./infra/llm/openai-service.js";
import { RSSScraper } from "./infra/scraper/rss-scraper.js";
import { ReadabilityExtractor } from "./infra/scraper/extractor.js";
import { S3ImageStorage } from "./infra/storage/s3-storage.js";

// Use cases
import { collectNews } from "./use-cases/collect.js";
import { clusterAndScore } from "./use-cases/cluster.js";
import { triageEvent } from "./use-cases/triage.js";
import { draftEvent } from "./use-cases/draft.js";
import { reviewEvent } from "./use-cases/review.js";
import { rewriteEvent } from "./use-cases/rewrite.js";
import { runConcurrent } from "./concurrency.js";

const CONCURRENCY = 5;
const STALE_HOURS = 24;

export async function main(dbPath?: string): Promise<void> {
  const startTime = Date.now();
  log.info("Pipeline started");

  const config = loadConfig(dbPath);
  setLogLevel(config.logLevel);

  // Stage 0: Migrations
  runMigrations(config.databasePath);

  const db = openDatabase(config.databasePath);

  try {
    // Wire infrastructure
    const eventRepo = new SQLiteEventRepository(db);
    const articleRepo = new SQLiteArticleRepository(db);
    const rawArticleRepo = new SQLiteRawArticleRepository(db);
    const llm = new OpenAILLMService(config.llmApiKey, config.llmModel, config.llmBaseUrl);
    const scraper = new RSSScraper();
    const extractor = new ReadabilityExtractor();
    const imageStorage = new S3ImageStorage({
      bucket: config.s3Bucket,
      endpoint: config.s3Endpoint,
      accessKey: config.s3AccessKey,
      secretKey: config.s3SecretKey,
      publicUrl: config.s3PublicUrl,
      region: config.s3Region,
    });

    // Build source tier map for scoring
    const sourceTiers = new Map<string, number>();
    for (const s of SOURCES) {
      sourceTiers.set(s.name, s.tier);
    }

    // Phase 1: Collect (scrape → ingest → enrich)
    log.info("=== Phase 1: Collect ===");
    const { scraped, inserted, enriched } = await collectNews(
      scraper, rawArticleRepo, extractor, imageStorage,
    );
    log.info("Collect complete", { scraped, inserted, enriched });

    // Phase 2: Cluster + Score
    log.info("=== Phase 2: Cluster & Score ===");
    const { newClusters, clustered } = clusterAndScore(rawArticleRepo, eventRepo, sourceTiers);
    log.info("Cluster & Score complete", { newClusters, clustered });

    // Phase 3: Newsroom processing
    log.info("=== Phase 3: Newsroom ===");
    await processEventsByStage(eventRepo, articleRepo, llm);

  } finally {
    db.close();
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  log.info("Pipeline complete", { durationSec, timestamp: new Date().toISOString() });
}

async function processEventsByStage(
  eventRepo: SQLiteEventRepository,
  articleRepo: SQLiteArticleRepository,
  llm: OpenAILLMService,
): Promise<void> {
  // Kill stale 'new' events — news older than STALE_HOURS is no longer relevant
  const killed = eventRepo.killStaleNewEvents(STALE_HOURS);
  if (killed > 0) log.info("Killed stale new events", { killed });

  // Kill stale triaged events — importance-based thresholds
  const killedTriaged = eventRepo.killStaleTriagedEvents();
  if (killedTriaged > 0) log.info("Killed stale triaged events", { killed: killedTriaged });

  // Priority 0: Breaking news fast track (importance >= 86)
  const breakingEvents = eventRepo.getBreakingTriaged();
  if (breakingEvents.length > 0) {
    log.info("Breaking news fast track", { count: breakingEvents.length });
    for (const event of breakingEvents) {
      try {
        await draftEvent(eventRepo, articleRepo, llm, event);
        const drafted = eventRepo.getById(event.id);
        if (drafted?.stage === "drafted") {
          await reviewEvent(eventRepo, articleRepo, llm, drafted);
          const reviewed = eventRepo.getById(event.id);
          if (reviewed?.stage === "reviewed") {
            await rewriteEvent(eventRepo, articleRepo, llm, reviewed, CONCURRENCY);
          }
        }
        eventRepo.markBreaking(event.id);
      } catch (err) {
        log.error("Breaking fast track failed", { eventId: event.id, error: String(err) });
      }
    }
  }

  // Priority 1: Rewrite reviewed → published (5 events concurrently)
  const reviewed = eventRepo.getByStage("reviewed");
  log.info("Events to rewrite", { count: reviewed.length });
  await runConcurrent(reviewed, async (event) => {
    try {
      await rewriteEvent(eventRepo, articleRepo, llm, event, CONCURRENCY);
    } catch (err) {
      log.error("Rewrite failed", { eventId: event.id, error: String(err) });
    }
  }, CONCURRENCY);

  // Priority 2: Review drafted → reviewed (5 concurrent)
  const drafted = eventRepo.getByStage("drafted");
  log.info("Events to review", { count: drafted.length });
  await runConcurrent(drafted, async (event) => {
    try {
      await reviewEvent(eventRepo, articleRepo, llm, event);
    } catch (err) {
      log.error("Review failed", { eventId: event.id, error: String(err) });
    }
  }, CONCURRENCY);

  // Priority 3: Draft triaged → drafted (5 concurrent)
  const triaged = eventRepo.getByStage("triaged");
  log.info("Events to draft", { count: triaged.length });
  await runConcurrent(triaged, async (event) => {
    try {
      await draftEvent(eventRepo, articleRepo, llm, event);
    } catch (err) {
      log.error("Draft failed", { eventId: event.id, error: String(err) });
    }
  }, CONCURRENCY);

  // Priority 4: Triage new → triaged/killed (5 concurrent)
  const newEvents = eventRepo.getByStage("new");
  log.info("Events to triage", { count: newEvents.length });
  await runConcurrent(newEvents, async (event) => {
    try {
      await triageEvent(eventRepo, llm, event);
    } catch (err) {
      log.error("Triage failed", { eventId: event.id, error: String(err) });
    }
  }, CONCURRENCY);
}

// Run standalone: tsx src/main.ts
import { fileURLToPath as _flu } from "node:url";
import _path from "node:path";

const _isMain =
  process.argv[1] &&
  _path.resolve(process.argv[1]) === _path.resolve(_flu(import.meta.url));

if (_isMain) {
  main().catch((err) => {
    log.error("Pipeline fatal error", {
      error: String(err),
      stack: (err as Error)?.stack,
    });
    process.exit(1);
  });
}
