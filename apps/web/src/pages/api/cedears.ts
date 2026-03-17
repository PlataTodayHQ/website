/**
 * CEDEARs panel from BYMA Open Data.
 * Data source: PyOBD-equivalent BYMA endpoint.
 */
import type { APIRoute } from "astro";
import {
  fetchCedears,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const data = await fetchCedears();
    return jsonResponse({ data, count: data.length }, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch CEDEARs");
  }
};
