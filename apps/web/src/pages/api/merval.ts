import type { APIRoute } from "astro";
import {
  getMerval, fetchBYMA, parseMervalFromBYMA,
  optionsResponse, jsonResponse, errorResponse,
  BYMA_INDEX_URL,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const cached = getMerval();
    if (cached) return jsonResponse(cached, 30, 60);

    const bymaData = await fetchBYMA(BYMA_INDEX_URL);
    const data = parseMervalFromBYMA(bymaData);
    return jsonResponse(data, 30, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch Merval data");
  }
};
