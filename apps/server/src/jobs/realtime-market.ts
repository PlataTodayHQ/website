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
// Exchange rates (Bluelytics + dolarapi)
// ---------------------------------------------------------------------------

async function fetchRatesRT(): Promise<void> {
  try {
    const [blueRes, dolarRes] = await Promise.all([
      fetchT(BLUELYTICS_URL),
      fetchT(DOLARAPI_URL).catch(() => null),
    ]);

    if (!blueRes.ok) throw new Error(`Bluelytics ${blueRes.status}`);
    const blueData: any = await blueRes.json();

    let mep: ExchangeRates["mep"] = null;
    let ccl: ExchangeRates["ccl"] = null;

    if (dolarRes?.ok) {
      const dolares: any[] = await dolarRes.json();
      for (const d of dolares) {
        if (d.casa === "bolsa") {
          mep = { value_buy: d.compra, value_sell: d.venta };
        } else if (d.casa === "contadoconliqui") {
          ccl = { value_buy: d.compra, value_sell: d.venta };
        }
      }
    }

    const rates: ExchangeRates = {
      blue: blueData.blue
        ? { value_buy: blueData.blue.value_buy, value_sell: blueData.blue.value_sell }
        : null,
      oficial: blueData.oficial
        ? { value_buy: blueData.oficial.value_buy, value_sell: blueData.oficial.value_sell }
        : null,
      mep,
      ccl,
    };

    setRates(rates);
  } catch (err) {
    console.error("[realtime] Rates error:", err);
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
      symbol: (s.symbol ?? s.denominacion ?? "").replace(".BA", ""),
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
