import type { APIRoute } from "astro";
import {
  getGovernmentBonds, BYMA_PUBLIC_BONDS_URL,
  fetchBYMA, parseBYMAAsset,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const cached = getGovernmentBonds();
    if (cached) return jsonResponse(cached, 15);

    const data = await fetchBYMA(BYMA_PUBLIC_BONDS_URL);
    const bonds = data.map((s: any) => parseBYMAAsset(s, "government_bond"));
    bonds.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

    return jsonResponse(bonds, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch government bonds");
  }
};
