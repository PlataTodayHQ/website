import type { APIRoute } from "astro";
import {
  getRates, BLUELYTICS_URL, fetchExchangeRatesData,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const cached = getRates();
    if (cached) return jsonResponse(cached, 30, 60);

    const data = await fetchExchangeRatesData(BLUELYTICS_URL);
    return jsonResponse(data, 30, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch exchange rates");
  }
};
