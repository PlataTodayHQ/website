/**
 * General board (panel general) stocks from BYMA Open Data.
 * Wider panel than leading equity — includes all listed stocks.
 * Data source: PyOBD-equivalent BYMA endpoint.
 */
import type { APIRoute } from "astro";
import {
  fetchGeneralBoard, parseBYMAStock,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async ({ url }) => {
  try {
    const excludeZero = url.searchParams.get("exclude_zero") === "true";
    const data = await fetchGeneralBoard(excludeZero);
    const stocks = data.map(parseBYMAStock);
    stocks.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

    return jsonResponse(stocks, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch general board");
  }
};
