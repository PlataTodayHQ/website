import type { APIRoute } from "astro";
import {
  getCedears, BYMA_CEDEARS_URL,
  fetchBYMA, parseBYMAAsset,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const cached = getCedears();
    if (cached) return jsonResponse(cached, 15);

    const data = await fetchBYMA(BYMA_CEDEARS_URL);
    const cedears = data.map((s: any) => parseBYMAAsset(s, "cedear"));
    cedears.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

    return jsonResponse(cedears, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch CEDEARs");
  }
};
