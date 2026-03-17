import type { APIRoute } from "astro";
import { getEconomicIndicators, getEconomicUpdatedAt, optionsResponse, jsonResponse, errorResponse } from "@plata-today/shared";

export const prerender = false;
export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const indicators = getEconomicIndicators();
    return jsonResponse({
      tna30: indicators?.plazoFijoTNA ?? null,
      badlar: indicators?.badlar ?? null,
      cer: indicators?.cer ?? null,
      uva: indicators?.uva ?? null,
      updatedAt: getEconomicUpdatedAt(),
      source: "bcra",
    }, 60, 300);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch plazo fijo data");
  }
};
