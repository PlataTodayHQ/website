import type { APIRoute } from "astro";
import {
  getStocks, BYMA_EQUITY_URL,
  fetchBYMA, parseBYMAStock,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    // Serve from in-memory store (populated every 30s by background job)
    const cached = getStocks();
    if (cached) return jsonResponse(cached, 15);

    // Fallback: direct fetch if store is empty (cold start)
    const data = await fetchBYMA(BYMA_EQUITY_URL);
    const stocks = data.map(parseBYMAStock);
    stocks.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

    return jsonResponse(stocks, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch stocks");
  }
};
