/**
 * Realtime market data fetcher — runs every 30 seconds.
 *
 * Fetches fast-moving data (merval index, exchange rates, stock prices)
 * and stores it in the in-memory MarketDataStore. API routes read from
 * the store instead of proxying each request to external APIs.
 *
 * Heavy/slow data (candles, profiles, fundamentals) is still handled by
 * the existing 5-minute market-data job that writes to SQLite.
 */

import {
  BLUELYTICS_URL, BYMA_INDEX_URL, BYMA_EQUITY_URL, fetchT,
  setMerval, setRates, setStocks,
  type MervalSnapshot, type ExchangeRates, type StockQuote,
} from "@plata-today/shared";

const DOLARAPI_URL = "https://dolarapi.com/v1/dolares";

let running = false;

export async function fetchRealtimeMarketData(): Promise<void> {
  if (running) return;
  running = true;

  try {
    await Promise.allSettled([
      fetchMervalRT(),
      fetchRatesRT(),
      fetchStocksRT(),
    ]);
  } finally {
    running = false;
  }
}

// ---------------------------------------------------------------------------
// Merval index
// ---------------------------------------------------------------------------

async function fetchMervalRT(): Promise<void> {
  try {
    const res = await fetchT(BYMA_INDEX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`BYMA ${res.status}`);
    const json: any = await res.json();
    if (!json?.data) throw new Error("BYMA: no data");

    const m = json.data.find((d: any) => d.symbol === "M");
    if (!m) throw new Error("BYMA: Merval not found");

    const snapshot: MervalSnapshot = {
      price: m.price,
      high: m.highPrice ?? m.high ?? null,
      low: m.lowPrice ?? m.low ?? null,
      previousClose: m.previousClosingPrice ?? null,
      variation: m.variation ?? null,
      volume: m.volume ?? null,
      source: "BYMA",
    };

    setMerval(snapshot);
  } catch (err) {
    console.error("[realtime] Merval error:", err);
  }
}

// ---------------------------------------------------------------------------
// Exchange rates — dolarapi (primary), Bluelytics (fallback for blue/oficial)
// ---------------------------------------------------------------------------

function parseDolarApi(dolares: any[]): ExchangeRates {
  const rates: ExchangeRates = { blue: null, oficial: null, mep: null, ccl: null };
  for (const d of dolares) {
    const pair = { value_buy: d.compra, value_sell: d.venta };
    if (d.casa === "blue") rates.blue = pair;
    else if (d.casa === "oficial") rates.oficial = pair;
    else if (d.casa === "bolsa") rates.mep = pair;
    else if (d.casa === "contadoconliqui") rates.ccl = pair;
  }
  return rates;
}

async function fetchRatesRT(): Promise<void> {
  try {
    // Primary: dolarapi.com — returns blue, oficial, MEP, CCL in one call
    const res = await fetchT(DOLARAPI_URL);
    if (!res.ok) throw new Error(`dolarapi ${res.status}`);
    const dolares: any[] = await res.json();
    setRates(parseDolarApi(dolares));
    return;
  } catch (err) {
    console.warn("[realtime] dolarapi failed, falling back to Bluelytics:", err);
  }

  // Fallback: Bluelytics — only blue + oficial (no MEP/CCL)
  try {
    const res = await fetchT(BLUELYTICS_URL);
    if (!res.ok) throw new Error(`Bluelytics ${res.status}`);
    const data: any = await res.json();

    setRates({
      blue: data.blue
        ? { value_buy: data.blue.value_buy, value_sell: data.blue.value_sell }
        : null,
      oficial: data.oficial
        ? { value_buy: data.oficial.value_buy, value_sell: data.oficial.value_sell }
        : null,
      mep: null,
      ccl: null,
    });
  } catch (err) {
    console.error("[realtime] Rates error (both sources failed):", err);
  }
}

// ---------------------------------------------------------------------------
// Stock prices (leading equities)
// ---------------------------------------------------------------------------

async function fetchStocksRT(): Promise<void> {
  try {
    const res = await fetchT(BYMA_EQUITY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
    });
    if (!res.ok) throw new Error(`BYMA ${res.status}`);
    const json: any = await res.json();
    if (!json?.data) throw new Error("No stock data from BYMA");

    const stocks: StockQuote[] = json.data.map((s: any) => ({
      symbol: s.symbol ?? s.denominacion ?? "",
      description: s.description ?? s.denominacion ?? "",
      price: s.price ?? s.ultimoPrecio ?? 0,
      variation: s.variation ?? s.variacionPorcentual ?? null,
      previousClose: s.previousClosingPrice ?? s.anteriorCierre ?? null,
      openingPrice: s.openingPrice ?? s.apertura ?? null,
      volume: s.volume ?? s.volumenNominal ?? 0,
      high: s.highPrice ?? s.maximo ?? null,
      low: s.lowPrice ?? s.minimo ?? null,
    }));

    stocks.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

    setStocks(stocks);
  } catch (err) {
    console.error("[realtime] Stocks error:", err);
  }
}
