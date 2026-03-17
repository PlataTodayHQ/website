import type { APIRoute } from "astro";
import {
  getEconomicIndicators, getEconomicUpdatedAt,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const indicators = getEconomicIndicators();
    return jsonResponse({
      rate: indicators?.bcraRate ?? null,
      reserves: indicators?.bcraReserves ?? null,
      monetaryBase: indicators?.bcraMonetaryBase ?? null,
      badlar: indicators?.badlar ?? null,
      cer: indicators?.cer ?? null,
      uva: indicators?.uva ?? null,
      plazoFijoTNA: indicators?.plazoFijoTNA ?? null,
      updatedAt: getEconomicUpdatedAt(),
      source: "bcra",
    }, 60, 300);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch BCRA data");
  }
};
