/**
 * Economic indicator fetching — country risk (EMBI+) and BCRA indicators.
 *
 * Runs every cycle (not gated by market hours) since these indicators
 * update independently of equity market schedules.
 */

import type Database from "better-sqlite3";
import {
  fetchT,
  AMBITO_COUNTRY_RISK_URL,
  BCRA_RATE_URL,
  BCRA_RESERVES_URL,
  BCRA_MONETARY_BASE_URL,
  BCRA_PLAZO_FIJO_URL,
  BCRA_BADLAR_URL,
  BCRA_CER_URL,
  BCRA_UVA_URL,
  updateEconomicIndicator,
} from "@plata-today/shared";

// ---------------------------------------------------------------------------
// Country Risk (EMBI+ spread) — source: Ámbito Financiero
// ---------------------------------------------------------------------------

export async function fetchCountryRisk(db: Database.Database): Promise<void> {
  try {
    const res = await fetchT(AMBITO_COUNTRY_RISK_URL);
    if (!res.ok) throw new Error(`Ambito country risk ${res.status}`);
    const data: any = await res.json();

    // Ámbito returns: { ultimo: "650", fecha: "17/03/2026 - 12:00" } or similar
    const value =
      typeof data === "object" && data.ultimo
        ? parseFloat(String(data.ultimo).replace(/\./g, "").replace(",", "."))
        : typeof data === "number"
          ? data
          : null;

    if (value != null && !isNaN(value)) {
      updateEconomicIndicator("countryRisk", value);

      const today = new Date().toISOString().slice(0, 10);
      db.prepare(
        `INSERT INTO economic_indicators (indicator, date, value, source)
         VALUES ('country_risk', ?, ?, 'ambito')
         ON CONFLICT(indicator, date, source) DO UPDATE SET value=excluded.value`,
      ).run(today, value);

      console.log("[market] Country risk:", value);
    }
  } catch (err) {
    console.error("[market] Country risk error:", err);
  }
}

// ---------------------------------------------------------------------------
// BCRA Indicators
// ---------------------------------------------------------------------------

interface BCRAResponse {
  results: Array<{ idVariable: number; fecha: string; valor: number }>;
}

const BCRA_INDICATORS: Array<{
  url: string;
  dbKey: string;
  storeKey: Parameters<typeof updateEconomicIndicator>[0];
}> = [
  { url: BCRA_RATE_URL, dbKey: "bcra_rate", storeKey: "bcraRate" },
  { url: BCRA_RESERVES_URL, dbKey: "bcra_reserves", storeKey: "bcraReserves" },
  { url: BCRA_MONETARY_BASE_URL, dbKey: "bcra_monetary_base", storeKey: "bcraMonetaryBase" },
  { url: BCRA_PLAZO_FIJO_URL, dbKey: "plazo_fijo_tna", storeKey: "plazoFijoTNA" },
  { url: BCRA_BADLAR_URL, dbKey: "badlar", storeKey: "badlar" },
  { url: BCRA_CER_URL, dbKey: "cer", storeKey: "cer" },
  { url: BCRA_UVA_URL, dbKey: "uva", storeKey: "uva" },
];

async function fetchSingleBCRA(
  db: Database.Database,
  url: string,
  dbKey: string,
  storeKey: Parameters<typeof updateEconomicIndicator>[0],
): Promise<void> {
  const res = await fetchT(url);
  if (!res.ok) throw new Error(`BCRA ${dbKey} ${res.status}`);
  const data: BCRAResponse = await res.json();

  const latest = data.results?.[0];
  if (!latest || latest.valor == null) return;

  const value = latest.valor;
  const date = latest.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10);

  updateEconomicIndicator(storeKey, value);

  db.prepare(
    `INSERT INTO economic_indicators (indicator, date, value, source)
     VALUES (?, ?, ?, 'bcra')
     ON CONFLICT(indicator, date, source) DO UPDATE SET value=excluded.value`,
  ).run(dbKey, date, value);

  console.log(`[market] BCRA ${dbKey}:`, value);
}

export async function fetchBCRAIndicators(db: Database.Database): Promise<void> {
  const results = await Promise.allSettled(
    BCRA_INDICATORS.map(({ url, dbKey, storeKey }) =>
      fetchSingleBCRA(db, url, dbKey, storeKey),
    ),
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      console.error(`[market] BCRA ${BCRA_INDICATORS[i].dbKey} error:`, r.reason);
    }
  }
}
