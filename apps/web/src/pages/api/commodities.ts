import type { APIRoute } from "astro";
import {
  fetchYahooChart,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

const SYMBOLS: Record<string, string> = {
  "GC=F": "Gold",
  "SI=F": "Silver",
  "CL=F": "Oil WTI",
};

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return jsonResponse(cache.data, 300);
    }

    const results = await Promise.all(
      Object.keys(SYMBOLS).map(async (symbol) => {
        const result = await fetchYahooChart(symbol, "1d", "1d");
        if (!result) return null;
        const meta = result.meta ?? {};
        const price = meta.regularMarketPrice ?? null;
        const prev = meta.chartPreviousClose ?? null;
        return {
          symbol,
          name: SYMBOLS[symbol] ?? symbol,
          price,
          previousClose: prev,
          change: prev && prev > 0 ? ((price - prev) / prev) * 100 : null,
          currency: meta.currency ?? "USD",
        };
      }),
    );

    const data = results.filter(Boolean);
    cache = { data, ts: Date.now() };

    return jsonResponse(data, 300);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch commodities");
  }
};
