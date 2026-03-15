import type Database from "better-sqlite3";
import { runPipeline } from "./pipeline.js";
import { fetchMarketData } from "./market-data.js";
import { fetchRealtimeMarketData } from "./realtime-market.js";
import { generateSitemaps } from "./sitemap.js";

const intervals: NodeJS.Timeout[] = [];

export function startJobs(db: Database.Database, distDir: string): void {
  // Run pipeline immediately on start, then every 15 minutes
  // Skip if LLM_API_KEY is not configured
  if (process.env.LLM_API_KEY) {
    runPipeline(db).catch((err) =>
      console.error("[scheduler] Pipeline startup error:", err),
    );
    intervals.push(
      setInterval(
        () =>
          runPipeline(db).catch((err) =>
            console.error("[scheduler] Pipeline interval error:", err),
          ),
        10 * 60 * 1000,
      ),
    );
  } else {
    console.log("[scheduler] LLM_API_KEY not set, pipeline disabled");
  }

  // Realtime market data: immediately, then every 30 seconds
  // Populates in-memory store for fast API responses
  fetchRealtimeMarketData().catch((err) =>
    console.error("[scheduler] Realtime market startup error:", err),
  );
  intervals.push(
    setInterval(
      () =>
        fetchRealtimeMarketData().catch((err) =>
          console.error("[scheduler] Realtime market interval error:", err),
        ),
      30 * 1000,
    ),
  );

  // Full market data (candles, profiles → DB): immediately, then every 5 minutes
  fetchMarketData(db).catch((err) =>
    console.error("[scheduler] Market data startup error:", err),
  );
  intervals.push(
    setInterval(
      () =>
        fetchMarketData(db).catch((err) =>
          console.error("[scheduler] Market data interval error:", err),
        ),
      5 * 60 * 1000,
    ),
  );

  // Generate sitemaps immediately, then every 24 hours
  generateSitemaps(db, distDir).catch((err) =>
    console.error("[scheduler] Sitemap startup error:", err),
  );
  intervals.push(
    setInterval(
      () =>
        generateSitemaps(db, distDir).catch((err) =>
          console.error("[scheduler] Sitemap interval error:", err),
        ),
      24 * 60 * 60 * 1000,
    ),
  );
}

export function stopJobs(): void {
  for (const id of intervals) clearInterval(id);
  intervals.length = 0;
  console.log("[jobs] All background jobs stopped");
}
