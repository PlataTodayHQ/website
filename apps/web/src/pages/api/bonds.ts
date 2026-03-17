/**
 * Government and corporate bonds from BYMA Open Data.
 * Data source: PyOBD-equivalent BYMA endpoints.
 */
import type { APIRoute } from "astro";
import {
  fetchGovernmentBonds, fetchCorporateBonds, fetchLetras,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async ({ url }) => {
  try {
    const type = url.searchParams.get("type") ?? "government";

    let data: any[];
    switch (type) {
      case "corporate":
        data = await fetchCorporateBonds();
        break;
      case "letras":
        data = await fetchLetras();
        break;
      case "government":
      default:
        data = await fetchGovernmentBonds();
        break;
    }

    return jsonResponse({ type, data, count: data.length }, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch bonds");
  }
};
