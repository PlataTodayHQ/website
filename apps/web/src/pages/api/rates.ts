import type { APIRoute } from "astro";
import {
  getRates, BLUELYTICS_URL, fetchExchangeRatesData,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    // Serve from in-memory store (populated every 30s by background job)
    const cached = getRates();
    if (cached) return jsonResponse(cached, 15);

    // Fallback: direct fetch if store is empty (cold start)
    const data = await fetchExchangeRatesData(BLUELYTICS_URL);
    return jsonResponse(data, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch exchange rates");
  }
};
