/**
 * Exchange rate fetching — current rates + 30-day history.
 */

import type Database from "better-sqlite3";
import { BLUELYTICS_URL, BLUELYTICS_EVOLUTION_URL, fetchT } from "@plata-today/shared";

export async function fetchExchangeRates(db: Database.Database): Promise<void> {
  try {
    const res = await fetchT(BLUELYTICS_URL);
    if (!res.ok) throw new Error(`Bluelytics ${res.status}`);
    const data: any = await res.json();

    const insert = db.prepare(
      `INSERT INTO exchange_rates (source, rate_type, buy, sell) VALUES (?, ?, ?, ?)`,
    );

    const tx = db.transaction(() => {
      if (data.blue) insert.run("bluelytics", "blue", data.blue.value_buy, data.blue.value_sell);
      if (data.oficial) insert.run("bluelytics", "oficial", data.oficial.value_buy, data.oficial.value_sell);
    });
    tx();

    console.log("[market] Exchange rates saved");
  } catch (err) {
    console.error("[market] Exchange rates error:", err);
  }
}

export async function fetchExchangeRateHistory(db: Database.Database): Promise<void> {
  try {
    const res = await fetchT(BLUELYTICS_EVOLUTION_URL);
    if (!res.ok) throw new Error(`Bluelytics evolution ${res.status}`);
    const data: any[] = await res.json();

    const upsert = db.prepare(
      `INSERT INTO exchange_rate_history (date, rate_type, buy, sell, source)
       VALUES (?, ?, ?, ?, 'bluelytics')
       ON CONFLICT(date, rate_type, source) DO UPDATE SET buy=excluded.buy, sell=excluded.sell`,
    );

    const tx = db.transaction(() => {
      for (const row of data) {
        const date = row.date?.slice(0, 10);
        if (!date) continue;
        if (row.source === "Blue") {
          upsert.run(date, "blue", row.value_buy, row.value_sell);
        } else if (row.source === "Oficial") {
          upsert.run(date, "oficial", row.value_buy, row.value_sell);
        }
      }
    });
    tx();

    console.log("[market] Exchange rate history saved", { rows: data.length });
  } catch (err) {
    console.error("[market] Exchange rate history error:", err);
  }
}
