import { runPipeline } from "./pipeline.js";
import { fetchMarketData } from "./market-data.js";
import { generateSitemaps } from "./sitemap.js";

const intervals: NodeJS.Timeout[] = [];

export function startJobs(dbPath: string, distDir: string): void {
  // Run pipeline immediately on start, then every 30 minutes
  // Skip if LLM_API_KEY is not configured
  if (process.env.LLM_API_KEY) {
    runPipeline(dbPath).catch((err) =>
      console.error("[scheduler] Pipeline startup error:", err),
    );
    intervals.push(
      setInterval(
        () =>
          runPipeline(dbPath).catch((err) =>
            console.error("[scheduler] Pipeline interval error:", err),
          ),
        15 * 60 * 1000,
      ),
    );
  } else {
    console.log("[scheduler] LLM_API_KEY not set, pipeline disabled");
  }

  // Fetch market data immediately, then every 5 minutes
  fetchMarketData(dbPath).catch((err) =>
    console.error("[scheduler] Market data startup error:", err),
  );
  intervals.push(
    setInterval(
      () =>
        fetchMarketData(dbPath).catch((err) =>
          console.error("[scheduler] Market data interval error:", err),
        ),
      5 * 60 * 1000,
    ),
  );

  // Generate sitemaps immediately, then every 24 hours
  generateSitemaps(dbPath, distDir).catch((err) =>
    console.error("[scheduler] Sitemap startup error:", err),
  );
  intervals.push(
    setInterval(
      () =>
        generateSitemaps(dbPath, distDir).catch((err) =>
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
