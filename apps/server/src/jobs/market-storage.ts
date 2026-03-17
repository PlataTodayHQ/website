/**
 * Shared storage helpers for market data jobs.
 */

import type Database from "better-sqlite3";

/** Save candle data to stock_candles table. */
export function saveCandles(
  db: Database.Database,
  symbol: string,
  interval: string,
  candles: Array<{ timestamp: number; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null }>,
): void {
  const upsert = db.prepare(
    `INSERT INTO stock_candles (symbol, interval, timestamp, open, high, low, close, volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(symbol, interval, timestamp)
     DO UPDATE SET open=excluded.open, high=excluded.high, low=excluded.low,
                   close=excluded.close, volume=excluded.volume`,
  );

  const tx = db.transaction(() => {
    for (const c of candles) {
      upsert.run(symbol, interval, c.timestamp, c.open, c.high, c.low, c.close, c.volume);
    }
  });
  tx();
}

/** Save candles from Yahoo chart format (for commodities fallback). */
export function saveCandlesFromYahoo(
  db: Database.Database,
  symbol: string,
  interval: string,
  result: any,
): void {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const candles = timestamps.map((ts: number, i: number) => ({
    timestamp: ts,
    open: quote.open?.[i] ?? null,
    high: quote.high?.[i] ?? null,
    low: quote.low?.[i] ?? null,
    close: quote.close?.[i] ?? null,
    volume: quote.volume?.[i] ?? null,
  }));
  saveCandles(db, symbol, interval, candles);
}

/**
 * Aggregate daily candles for stocks from stock_prices snapshots.
 * Groups by date, uses first price as open, last as close, max/min for high/low, max volume.
 */
export function aggregateStockCandles(db: Database.Database): number {
  const symbols = db.prepare(
    `SELECT DISTINCT symbol FROM stock_prices
     WHERE fetched_at > datetime('now', '-30 days')`,
  ).all() as Array<{ symbol: string }>;

  let saved = 0;

  for (const { symbol } of symbols) {
    const rows = db.prepare(
      `SELECT
         strftime('%s', date(fetched_at)) AS day_ts,
         MIN(CASE WHEN rn = 1 THEN opening_price ELSE NULL END) AS open_price,
         MAX(high) AS high,
         MIN(low) AS low,
         -- last price of the day (max rowid = latest)
         (SELECT sp2.price FROM stock_prices sp2
          WHERE sp2.symbol = ? AND date(sp2.fetched_at) = date(sp.fetched_at)
          ORDER BY sp2.id DESC LIMIT 1) AS close_price,
         MAX(volume) AS volume
       FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY date(fetched_at) ORDER BY id ASC) AS rn
         FROM stock_prices WHERE symbol = ? AND fetched_at > datetime('now', '-30 days')
       ) sp
       GROUP BY date(fetched_at)
       HAVING day_ts IS NOT NULL`,
    ).all(symbol, symbol) as Array<{
      day_ts: string; open_price: number | null; high: number | null;
      low: number | null; close_price: number | null; volume: number | null;
    }>;

    if (rows.length === 0) continue;

    const candles = rows.map((r) => ({
      timestamp: parseInt(r.day_ts, 10),
      open: r.open_price,
      high: r.high,
      low: r.low,
      close: r.close_price,
      volume: r.volume,
    }));

    saveCandles(db, symbol, "1d", candles);
    saved++;
  }

  return saved;
}

/**
 * Aggregate daily candles for Merval from merval_snapshots.
 */
export function aggregateMervalCandles(db: Database.Database): void {
  const rows = db.prepare(
    `SELECT
       strftime('%s', date(fetched_at)) AS day_ts,
       -- first snapshot of the day as open
       (SELECT ms2.price FROM merval_snapshots ms2
        WHERE date(ms2.fetched_at) = date(ms.fetched_at)
        ORDER BY ms2.id ASC LIMIT 1) AS open_price,
       MAX(COALESCE(high, price)) AS high,
       MIN(COALESCE(low, price)) AS low,
       -- last snapshot of the day as close
       (SELECT ms3.price FROM merval_snapshots ms3
        WHERE date(ms3.fetched_at) = date(ms.fetched_at)
        ORDER BY ms3.id DESC LIMIT 1) AS close_price,
       MAX(volume) AS volume
     FROM merval_snapshots ms
     WHERE fetched_at > datetime('now', '-30 days')
     GROUP BY date(fetched_at)
     HAVING day_ts IS NOT NULL`,
  ).all() as Array<{
    day_ts: string; open_price: number | null; high: number | null;
    low: number | null; close_price: number | null; volume: number | null;
  }>;

  if (rows.length === 0) return;

  const candles = rows.map((r) => ({
    timestamp: parseInt(r.day_ts, 10),
    open: r.open_price,
    high: r.high,
    low: r.low,
    close: r.close_price,
    volume: r.volume,
  }));

  saveCandles(db, "^MERV", "1d", candles);
  console.log("[market] Merval candles aggregated", { days: candles.length });
}

/** Prune old market data to prevent unbounded table growth. */
export function pruneOldData(db: Database.Database): void {
  try {
    db.prepare("DELETE FROM exchange_rates WHERE fetched_at < datetime('now', '-7 days')").run();
    db.prepare("DELETE FROM merval_snapshots WHERE fetched_at < datetime('now', '-7 days')").run();
    db.prepare("DELETE FROM stock_prices WHERE fetched_at < datetime('now', '-7 days')").run();
    db.prepare("DELETE FROM exchange_rate_history WHERE date < date('now', '-180 days')").run();
    db.prepare("DELETE FROM stock_fundamentals WHERE fetched_at < datetime('now', '-90 days')").run();
    db.prepare("DELETE FROM financial_statements WHERE fetched_at < datetime('now', '-365 days')").run();

    // Log DB size for monitoring
    const sizeRow = db.prepare("SELECT page_count * page_size AS size FROM pragma_page_count(), pragma_page_size()").get() as { size: number } | undefined;
    if (sizeRow) {
      const sizeMB = (sizeRow.size / 1024 / 1024).toFixed(1);
      console.log(`[market-data] DB size: ${sizeMB} MB`);
      if (sizeRow.size > 500 * 1024 * 1024) {
        console.warn("[market-data] WARNING: DB size exceeds 500 MB!");
      }
    }
  } catch (err) {
    console.error("[market-data] Prune error:", err);
  }
}
