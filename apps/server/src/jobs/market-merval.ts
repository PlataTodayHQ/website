/**
 * Merval index — snapshot from BYMA, candles aggregated from snapshots.
 */

import type Database from "better-sqlite3";
import { BYMA_INDEX_URL, fetchBYMA, parseMervalFromBYMA } from "@plata-today/shared";
import { aggregateMervalCandles } from "./market-storage.js";

export async function fetchMerval(db: Database.Database): Promise<void> {
  try {
    const data = await fetchBYMA(BYMA_INDEX_URL);
    const m = parseMervalFromBYMA(data);

    db.prepare(
      `INSERT INTO merval_snapshots (price, high, low, previous_close, variation, volume, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(m.price, m.high, m.low, m.previousClose, m.variation, m.volume, m.source);

    console.log("[market] Merval snapshot saved", { price: m.price });
  } catch (err) {
    console.error("[market] Merval error:", err);
  }
}

export async function fetchMervalCandles(db: Database.Database): Promise<void> {
  try {
    aggregateMervalCandles(db);
  } catch (err) {
    console.error("[market] Merval candles error:", err);
  }
}
