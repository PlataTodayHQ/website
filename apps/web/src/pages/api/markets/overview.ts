import type { APIRoute } from "astro";
import {
  getRates, getMerval, getStocks,
  BLUELYTICS_URL, BYMA_INDEX_URL, BYMA_EQUITY_URL,
  fetchExchangeRatesData, fetchBYMA, parseMervalFromBYMA, parseBYMAStock,
  fetchYahooChart,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

/**
 * Combined market overview endpoint.
 * Returns rates + merval + top stocks + commodities in a single response.
 * Used by the Markets Hub to eliminate multiple parallel fetches.
 */
export const GET: APIRoute = async () => {
  try {
    // Gather all data in parallel
    const [rates, merval, stocks, commodities] = await Promise.all([
      resolveRates(),
      resolveMerval(),
      resolveStocks(),
      resolveCommodities(),
    ]);

    return jsonResponse({ rates, merval, stocks, commodities }, 30, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch market overview");
  }
};

async function resolveRates() {
  const cached = getRates();
  if (cached) return cached;
  try {
    return await fetchExchangeRatesData(BLUELYTICS_URL);
  } catch {
    return null;
  }
}

async function resolveMerval() {
  const cached = getMerval();
  if (cached) return cached;
  try {
    const data = await fetchBYMA(BYMA_INDEX_URL);
    return parseMervalFromBYMA(data);
  } catch {
    return null;
  }
}

async function resolveStocks() {
  const cached = getStocks();
  if (cached) return cached.slice(0, 5);
  try {
    const data = await fetchBYMA(BYMA_EQUITY_URL);
    return data.map(parseBYMAStock)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 5);
  } catch {
    return null;
  }
}

async function resolveCommodities() {
  const SYMBOLS: Record<string, string> = {
    "GC=F": "Gold",
    "SI=F": "Silver",
    "CL=F": "Oil WTI",
  };
  try {
    const results = await Promise.all(
      Object.keys(SYMBOLS).map(async (symbol) => {
        const result = await fetchYahooChart(symbol, "1d", "1d");
        if (!result) return null;
        const meta = result.meta ?? {};
        const price = meta.regularMarketPrice ?? null;
        const prev = meta.chartPreviousClose ?? null;
        return {
          symbol,
          name: SYMBOLS[symbol],
          price,
          previousClose: prev,
          change: prev && prev > 0 ? ((price - prev) / prev) * 100 : null,
          currency: meta.currency ?? "USD",
        };
      }),
    );
    return results.filter(Boolean);
  } catch {
    return null;
  }
}
