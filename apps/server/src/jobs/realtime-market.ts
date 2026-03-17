/**
 * Realtime market data fetcher — runs every 60 seconds.
 *
 * Fetches fast-moving data (merval index, exchange rates, stock prices)
 * and stores it in the in-memory MarketDataStore. API routes read from
 * the store instead of proxying each request to external APIs.
 */

import {
  BLUELYTICS_URL, BYMA_INDEX_URL, BYMA_EQUITY_URL,
  BYMA_CEDEARS_URL, BYMA_PUBLIC_BONDS_URL, BYMA_CORPORATE_BONDS_URL, BYMA_LETRAS_URL,
  fetchBYMA, parseMervalFromBYMA, parseBYMAAsset, fetchExchangeRatesData,
  setMerval, setRates, setStocks,
  alertOnFailure, resetFailureCount,
  setCedears, setGovernmentBonds, setCorporateBonds, setLetras,
  type AssetType, type ExchangeRates, type StockQuote,
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
      fetchAssetRT(BYMA_CEDEARS_URL, "cedear", setCedears),
      fetchAssetRT(BYMA_PUBLIC_BONDS_URL, "government_bond", setGovernmentBonds),
      fetchAssetRT(BYMA_CORPORATE_BONDS_URL, "corporate_bond", setCorporateBonds),
      fetchAssetRT(BYMA_LETRAS_URL, "letra", setLetras),
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
    const stocks: StockQuote[] = data.map((s: any) => parseBYMAAsset(s, "stock"));
    stocks.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    setStocks(stocks);
  } catch (err) {
    console.error("[realtime] Stocks error:", err);
  }
}

async function fetchAssetRT(
  url: string,
  assetType: AssetType,
  setter: (data: StockQuote[]) => void,
): Promise<void> {
  try {
    const data = await fetchBYMA(url);
    const items: StockQuote[] = data.map((s: any) => parseBYMAAsset(s, assetType));
    items.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    setter(items);
  } catch (err) {
    console.error(`[realtime] ${assetType} error:`, err);
  }
}
