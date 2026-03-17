import type { APIRoute } from "astro";
import {
  getLetras, BYMA_LETRAS_URL,
  fetchBYMA, parseBYMAAsset,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const cached = getLetras();
    if (cached) return jsonResponse(cached, 15);

    const data = await fetchBYMA(BYMA_LETRAS_URL);
    const letras = data.map((s: any) => parseBYMAAsset(s, "letra"));
    letras.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));

    return jsonResponse(letras, 60);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch letras");
  }
};
