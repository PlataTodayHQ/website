/**
 * Realtime market data fetcher — runs every 30 seconds.
 *
 * Fetches fast-moving data (merval index, exchange rates, stock prices)
 * and stores it in the in-memory MarketDataStore. API routes read from
 * the store instead of proxying each request to external APIs.
 *
 * Uses BYMA direct POST as primary, with session-based fallback (PyOBD pattern)
 * for more reliable access when the simple POST fails.
 */

import {
  BLUELYTICS_URL, BYMA_INDEX_URL, BYMA_EQUITY_URL,
  fetchBYMA, parseMervalFromBYMA, parseBYMAStock, fetchExchangeRatesData,
  fetchBYMASession, resetBYMASession,
  setMerval, setRates, setStocks,
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
  } finally {
    running = false;
  }
}

async function fetchMervalRT(): Promise<void> {
  try {
    const data = await fetchBYMA(BYMA_INDEX_URL);
    setMerval(parseMervalFromBYMA(data));
  } catch (err) {
    // Fallback: session-based fetch (PyOBD pattern with cookies)
    try {
      const data = await fetchBYMASession(BYMA_INDEX_URL);
      setMerval(parseMervalFromBYMA(data));
    } catch (err2) {
      console.error("[realtime] Merval error (both methods):", err, err2);
      resetBYMASession();
    }
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
    // Fallback: session-based fetch (PyOBD pattern with cookies)
    try {
      const data = await fetchBYMASession(BYMA_EQUITY_URL, {
        excludeZeroPxAndQty: false,
        T2: true,
        T1: false,
        T0: false,
      });
      const stocks: StockQuote[] = data.map(parseBYMAStock);
      stocks.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
      setStocks(stocks);
    } catch (err2) {
      console.error("[realtime] Stocks error (both methods):", err, err2);
      resetBYMASession();
    }
  }
}
