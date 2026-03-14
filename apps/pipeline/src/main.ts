import { loadConfig } from "./config.js";
import { openDatabase } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { SOURCES } from "./scraper/sources.js";
import { log, setLogLevel } from "./logger.js";

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
import { translateEvent } from "./use-cases/translate.js";

const TIME_BUDGET_MS = 12 * 60 * 1000;
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

    // Phase 3: Newsroom processing (time-budgeted)
    log.info("=== Phase 3: Newsroom ===");
    await processEventsByStage(eventRepo, articleRepo, llm, startTime);

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
  startTime: number,
): Promise<void> {
  const budgetLeft = () => Date.now() - startTime < TIME_BUDGET_MS;

  // Kill stale 'new' events — news older than STALE_HOURS is no longer relevant
  const killed = eventRepo.killStaleNewEvents(STALE_HOURS);
  if (killed > 0) log.info("Killed stale new events", { killed });

  // Priority 1: Translate reviewed → published
  const reviewed = eventRepo.getByStage("reviewed");
  log.info("Events to translate", { count: reviewed.length });
  for (const event of reviewed) {
    if (!budgetLeft()) { log.info("Time budget exhausted"); return; }
    try {
      await translateEvent(eventRepo, articleRepo, llm, event);
    } catch (err) {
      log.error("Translate failed", { eventId: event.id, error: String(err) });
    }
  }

  // Priority 2: Review drafted → reviewed
  const drafted = eventRepo.getByStage("drafted");
  log.info("Events to review", { count: drafted.length });
  for (const event of drafted) {
    if (!budgetLeft()) { log.info("Time budget exhausted"); return; }
    try {
      await reviewEvent(eventRepo, articleRepo, llm, event);
    } catch (err) {
      log.error("Review failed", { eventId: event.id, error: String(err) });
    }
  }

  // Priority 3: Draft triaged → drafted
  const triaged = eventRepo.getByStage("triaged");
  log.info("Events to draft", { count: triaged.length });
  for (const event of triaged) {
    if (!budgetLeft()) { log.info("Time budget exhausted"); return; }
    try {
      await draftEvent(eventRepo, articleRepo, llm, event);
    } catch (err) {
      log.error("Draft failed", { eventId: event.id, error: String(err) });
    }
  }

  // Priority 4: Triage new → triaged/killed
  const newEvents = eventRepo.getByStage("new");
  log.info("Events to triage", { count: newEvents.length });
  for (const event of newEvents) {
    if (!budgetLeft()) { log.info("Time budget exhausted"); return; }
    try {
      await triageEvent(eventRepo, llm, event);
    } catch (err) {
      log.error("Triage failed", { eventId: event.id, error: String(err) });
    }
  }
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
