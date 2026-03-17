/**
 * Market data orchestrator — runs every 5 minutes.
 *
 * Coordinates all market data jobs:
 * - Exchange rates (current + history)
 * - Merval index (snapshot + candles)
 * - Stock prices, candles, and profiles
 * - Financial statements
 * - Data pruning
 *
 * Market-hours-aware: during off-hours (17:00-11:00 ART + weekends),
 * skips stock snapshots and batches profiles/financials more aggressively.
 */

import type Database from "better-sqlite3";
import {
  isMarketOpen, alertOnFailure, resetFailureCount,
  BYMA_CEDEARS_URL, BYMA_CEDEARS_FALLBACK_URL,
  BYMA_PUBLIC_BONDS_URL, BYMA_CORPORATE_BONDS_URL, BYMA_LETRAS_URL,
} from "@plata-today/shared";
import { recordJobStart, recordJobEnd } from "./job-tracking.js";
import { fetchExchangeRates, fetchExchangeRateHistory } from "./market-exchanges.js";
import { fetchMerval, fetchMervalCandles } from "./market-merval.js";
import { fetchStocks, fetchAssetPrices, fetchStockCandles, fetchStockProfiles } from "./market-stocks.js";
import { fetchFinancialStatements } from "./market-financials.js";
import { pruneOldData } from "./market-storage.js";

let running = false;

export async function fetchMarketData(db: Database.Database): Promise<void> {
  if (running) {
    console.log("[market-data] Already running, skipping");
    return;
  }
  running = true;

  const runId = recordJobStart(db, "market-data");
  const marketOpen = isMarketOpen();

  try {
    // Core data: exchange rates always run, stocks/assets only during market hours
    const coreJobs: Promise<void>[] = [
      fetchExchangeRates(db),
      fetchExchangeRateHistory(db),
      fetchMerval(db),
    ];
    if (marketOpen) {
      coreJobs.push(
        fetchStocks(db),
        fetchAssetPricesWithFallback(db, BYMA_CEDEARS_URL, BYMA_CEDEARS_FALLBACK_URL, "cedear"),
        fetchAssetPrices(db, BYMA_PUBLIC_BONDS_URL, "government_bond"),
        fetchAssetPrices(db, BYMA_CORPORATE_BONDS_URL, "corporate_bond"),
        fetchAssetPrices(db, BYMA_LETRAS_URL, "letra"),
      );
    }
    await Promise.allSettled(coreJobs);

    // Candles: aggregate during market hours, run final aggregation after close
    if (marketOpen) {
      await runWithAlert("merval-candles", () => fetchMervalCandles(db));
      await runWithAlert("stock-candles", () => fetchStockCandles(db));
    }

    // Profiles & financials: more aggressive off-hours (handled by batch size in those functions)
    await runWithAlert("stock-profiles", () => fetchStockProfiles(db, marketOpen));
    await runWithAlert("financials", () => fetchFinancialStatements(db, marketOpen));

    // Prune old market data
    pruneOldData(db);

    recordJobEnd(db, runId, "success");
    resetFailureCount("market-data");
  } catch (err) {
    recordJobEnd(db, runId, "error", String(err));
    await alertOnFailure("market-data", err);
    throw err;
  } finally {
    running = false;
  }
}

async function runWithAlert(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    resetFailureCount(name);
  } catch (err) {
    await alertOnFailure(name, err);
  }
}

async function fetchAssetPricesWithFallback(
  db: Database.Database,
  url: string,
  fallbackUrl: string,
  assetType: Parameters<typeof fetchAssetPrices>[2],
): Promise<void> {
  try {
    await fetchAssetPrices(db, url, assetType);
  } catch {
    await fetchAssetPrices(db, fallbackUrl, assetType);
  }
}
