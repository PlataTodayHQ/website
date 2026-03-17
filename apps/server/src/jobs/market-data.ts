/**
 * Market data orchestrator — runs every 5 minutes.
 *
 * Coordinates all market data jobs:
 * - Exchange rates (current + history)
 * - Merval index (snapshot + candles)
 * - Stock prices, candles, and profiles
 * - Data pruning
 */

import type Database from "better-sqlite3";
import {
  BYMA_CEDEARS_URL, BYMA_PUBLIC_BONDS_URL, BYMA_CORPORATE_BONDS_URL, BYMA_LETRAS_URL,
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

  try {
    // Core data: exchange rates, merval, stock prices, and all asset types
    await Promise.allSettled([
      fetchExchangeRates(db),
      fetchExchangeRateHistory(db),
      fetchMerval(db),
      fetchStocks(db),
      fetchAssetPrices(db, BYMA_CEDEARS_URL, "cedear"),
      fetchAssetPrices(db, BYMA_PUBLIC_BONDS_URL, "government_bond"),
      fetchAssetPrices(db, BYMA_CORPORATE_BONDS_URL, "corporate_bond"),
      fetchAssetPrices(db, BYMA_LETRAS_URL, "letra"),
    ]);

    // Heavier data: candles + profiles (rate-limited, run less aggressively)
    await fetchMervalCandles(db);
    await fetchStockCandles(db);
    await fetchStockProfiles(db);
    await fetchFinancialStatements(db);

    // Prune old market data to prevent unbounded table growth
    pruneOldData(db);

    recordJobEnd(db, runId, "success");
  } catch (err) {
    recordJobEnd(db, runId, "error", String(err));
    throw err;
  } finally {
    running = false;
  }
}
