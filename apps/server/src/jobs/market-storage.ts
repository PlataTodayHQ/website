/**
 * Shared storage helpers for market data jobs.
 */

import type Database from "better-sqlite3";

/** Save Yahoo chart candles to stock_candles table. */
export function saveCandles(
  db: Database.Database,
  symbol: string,
  interval: string,
  result: any,
): void {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};

  const upsert = db.prepare(
    `INSERT INTO stock_candles (symbol, interval, timestamp, open, high, low, close, volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(symbol, interval, timestamp)
     DO UPDATE SET open=excluded.open, high=excluded.high, low=excluded.low,
                   close=excluded.close, volume=excluded.volume`,
  );

  const tx = db.transaction(() => {
    for (let i = 0; i < timestamps.length; i++) {
      upsert.run(
        symbol,
        interval,
        timestamps[i],
        quote.open?.[i] ?? null,
        quote.high?.[i] ?? null,
        quote.low?.[i] ?? null,
        quote.close?.[i] ?? null,
        quote.volume?.[i] ?? null,
      );
    }
  });
  tx();
}

/** Prune old market data to prevent unbounded table growth. */
export function pruneOldData(db: Database.Database): void {
  try {
    db.prepare("DELETE FROM exchange_rates WHERE fetched_at < datetime('now', '-30 days')").run();
    db.prepare("DELETE FROM merval_snapshots WHERE fetched_at < datetime('now', '-30 days')").run();
    db.prepare("DELETE FROM stock_prices WHERE fetched_at < datetime('now', '-30 days')").run();
    db.prepare("DELETE FROM stock_fundamentals WHERE fetched_at < datetime('now', '-90 days')").run();
  } catch (err) {
    console.error("[market-data] Prune error:", err);
  }
}
