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

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
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
          name: SYMBOLS[symbol] ?? symbol,
          price,
          previousClose: prev,
          change: prev && prev > 0 ? ((price - prev) / prev) * 100 : null,
          currency: meta.currency ?? "USD",
        };
      }),
    );

    return jsonResponse(results.filter(Boolean), 300, 600);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch commodities");
  }
};
