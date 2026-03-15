import type { APIRoute } from "astro";
import {
  getMerval, fetchBYMA, parseMervalFromBYMA, fetchYahooChart,
  optionsResponse, jsonResponse, errorResponse,
  BYMA_INDEX_URL,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    // Serve from in-memory store (populated every 30s by background job)
    const cached = getMerval();
    if (cached) return jsonResponse(cached, 15);

    // Fallback: direct fetch if store is empty (cold start)
    let data: any;
    try {
      const bymaData = await fetchBYMA(BYMA_INDEX_URL);
      data = parseMervalFromBYMA(bymaData);
    } catch {
      const result = await fetchYahooChart("%5EMERV", "1d", "1d");
      if (!result) throw new Error("No Merval data from Yahoo");
      const meta = result.meta ?? {};
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose;
      data = {
        price,
        high: null,
        low: null,
        previousClose: prev,
        variation: prev > 0 ? (price - prev) / prev : null,
        volume: null,
        source: "Yahoo",
      };
    }

    return jsonResponse(data, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch Merval data");
  }
};
