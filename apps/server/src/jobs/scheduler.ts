import { runPipeline } from "./pipeline.js";
import { fetchMarketData } from "./market-data.js";

const intervals: NodeJS.Timeout[] = [];

export function startJobs(dbPath: string): void {
  // Run pipeline immediately on start, then every 30 minutes
  runPipeline(dbPath);
  intervals.push(
    setInterval(() => runPipeline(dbPath), 30 * 60 * 1000),
  );

  // Fetch market data immediately, then every 5 minutes
  fetchMarketData(dbPath);
  intervals.push(
    setInterval(() => fetchMarketData(dbPath), 5 * 60 * 1000),
  );
}

export function stopJobs(): void {
  for (const id of intervals) clearInterval(id);
  intervals.length = 0;
  console.log("[jobs] All background jobs stopped");
}
