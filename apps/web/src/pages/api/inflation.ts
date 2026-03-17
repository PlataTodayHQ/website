import type { APIRoute } from "astro";
import { getEconomicIndicators, getEconomicUpdatedAt, optionsResponse, jsonResponse, errorResponse } from "@plata-today/shared";

export const prerender = false;
export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const indicators = getEconomicIndicators();
    return jsonResponse({
      monthly: indicators?.inflationMonthly ?? null,
      annual: indicators?.inflationAnnual ?? null,
      cer: indicators?.cer ?? null,
      updatedAt: getEconomicUpdatedAt(),
      source: "indec",
    }, 300, 600);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch inflation data");
  }
};
