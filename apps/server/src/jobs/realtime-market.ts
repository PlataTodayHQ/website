/**
 * Realtime market data fetcher — runs every 60 seconds.
 *
 * Fetches fast-moving data (merval index, exchange rates, stock prices)
 * and stores it in the in-memory MarketDataStore. API routes read from
 * the store instead of proxying each request to external APIs.
 */

import {
  BLUELYTICS_URL, BYMA_INDEX_URL, BYMA_EQUITY_URL,
  fetchBYMA, parseMervalFromBYMA, parseBYMAStock, fetchExchangeRatesData,
  setMerval, setRates, setStocks,
  alertOnFailure, resetFailureCount,
  type ExchangeRates, type StockQuote,
} from "@plata-today/shared";

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
    resetFailureCount("realtime-market");
  } catch (err) {
    await alertOnFailure("realtime-market", err);
  } finally {
    running = false;
  }
}

async function fetchMervalRT(): Promise<void> {
  try {
    const data = await fetchBYMA(BYMA_INDEX_URL);
    setMerval(parseMervalFromBYMA(data));
  } catch (err) {
    console.error("[realtime] Merval error:", err);
  }
}

async function fetchRatesRT(): Promise<void> {
  try {
    const data = await fetchExchangeRatesData(BLUELYTICS_URL);
    const rates: ExchangeRates = {
      blue: data.blue
        ? { value_buy: data.blue.value_buy, value_sell: data.blue.value_sell }
        : null,
      oficial: data.oficial
        ? { value_buy: data.oficial.value_buy, value_sell: data.oficial.value_sell }
        : null,
      mep: data.mep,
      ccl: data.ccl,
    };
    setRates(rates);
  } catch (err) {
    console.error("[realtime] Rates error:", err);
  }
}

async function fetchStocksRT(): Promise<void> {
  try {
    const data = await fetchBYMA(BYMA_EQUITY_URL);
    const stocks: StockQuote[] = data.map(parseBYMAStock);
    stocks.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    setStocks(stocks);
  } catch (err) {
    console.error("[realtime] Stocks error:", err);
  }
}
