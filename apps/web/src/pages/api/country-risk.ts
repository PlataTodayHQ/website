import type { APIRoute } from "astro";
import { getEconomicIndicators, getEconomicUpdatedAt, optionsResponse, jsonResponse, errorResponse } from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const indicators = getEconomicIndicators();
    const countryRisk = indicators?.countryRisk ?? null;
    return jsonResponse({
      value: countryRisk,
      indicator: "embi_spread",
      updatedAt: getEconomicUpdatedAt(),
      source: "ambito",
    }, 60, 120);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch country risk");
  }
};
