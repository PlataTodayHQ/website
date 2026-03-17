/**
 * BYMA historical candle backfill — uses PyOBD-equivalent historical series endpoint.
 *
 * Fetches daily OHLCV data directly from BYMA for Argentine stocks, providing
 * native historical data without depending on Yahoo Finance.
 *
 * Runs as part of the market-data orchestrator, filling gaps in stock_candles.
 */

import type Database from "better-sqlite3";
import { fetchDailyHistory, sleep } from "@plata-today/shared";

/**
 * Backfill BYMA historical candles for symbols that have recent prices
 * but missing candle data in the DB.
 *
 * Fetches up to 5 symbols per run to avoid overloading BYMA.
 */
export async function fetchBYMAHistoricalCandles(db: Database.Database): Promise<void> {
  // Find symbols with recent stock prices but sparse candle data
  const symbols = db.prepare(
    `SELECT DISTINCT sp.symbol FROM stock_prices sp
     WHERE sp.fetched_at > datetime('now', '-1 hour')
       AND sp.symbol NOT IN (
         SELECT DISTINCT symbol FROM stock_candles
         WHERE interval = '1d'
           AND timestamp > unixepoch('now', '-7 days')
       )
     ORDER BY sp.symbol
     LIMIT 5`,
  ).all() as Array<{ symbol: string }>;

  if (symbols.length === 0) return;

  const upsert = db.prepare(
    `INSERT INTO stock_candles (symbol, interval, timestamp, open, high, low, close, volume)
     VALUES (?, '1d', ?, ?, ?, ?, ?, ?)
     ON CONFLICT(symbol, interval, timestamp) DO UPDATE SET
       open=excluded.open, high=excluded.high, low=excluded.low,
       close=excluded.close, volume=excluded.volume`,
  );

  let totalSaved = 0;

  for (const { symbol } of symbols) {
    try {
      const toDate = new Date().toISOString().slice(0, 10);
      const fromDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const candles = await fetchDailyHistory(symbol, fromDate, toDate);
      if (candles.length === 0) continue;

      const tx = db.transaction(() => {
        for (const c of candles) {
          upsert.run(symbol, c.timestamp, c.open, c.high, c.low, c.close, c.volume);
        }
      });
      tx();

      totalSaved += candles.length;
      await sleep(500);
    } catch {
      // Skip individual symbol errors
    }
  }

  if (totalSaved > 0) {
    console.log("[market] BYMA historical candles saved", { count: totalSaved });
  }
}
