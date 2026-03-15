/**
 * Merval index — snapshot from BYMA + candles from Yahoo.
 */

import type Database from "better-sqlite3";
import {
  BYMA_INDEX_URL, YAHOO_UA,
  fetchBYMA, parseMervalFromBYMA, fetchYahooChart,
} from "@plata-today/shared";
import { saveCandles } from "./market-storage.js";

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
    const result = await fetchYahooChart("%5EMERV", "1d", "1mo");
    if (!result) throw new Error("No Merval chart data");

    saveCandles(db, "^MERV", "1d", result);
    console.log("[market] Merval candles saved");
  } catch (err) {
    console.error("[market] Merval candles error:", err);
  }
}
