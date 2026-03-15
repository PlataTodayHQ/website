import type { APIRoute } from "astro";
import { getStocks, fetchT } from "@plata-today/shared";

export const prerender = false;

const BYMA_URL =
  "https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/leading-equity";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const GET: APIRoute = async () => {
  try {
    // Serve from in-memory store (populated every 30s by background job)
    const cached = getStocks();
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=15",
          ...CORS_HEADERS,
        },
      });
    }

    // Fallback: direct fetch if store is empty (cold start)
    const res = await fetchT(BYMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "{}",
    });

    if (!res.ok) throw new Error(`BYMA ${res.status}`);
    const json: any = await res.json();
    if (!json?.data) throw new Error("No data from BYMA");

    const stocks = json.data.map((s: any) => ({
      symbol: (s.symbol ?? s.denominacion ?? "").replace(".BA", ""),
      description: s.description ?? s.denominacion ?? "",
      price: s.price ?? s.ultimoPrecio ?? 0,
      variation: s.variation ?? s.variacionPorcentual ?? null,
      previousClose: s.previousClosingPrice ?? s.anteriorCierre ?? null,
      openingPrice: s.openingPrice ?? s.apertura ?? null,
      volume: s.volume ?? s.volumenNominal ?? 0,
      high: s.highPrice ?? s.maximo ?? null,
      low: s.lowPrice ?? s.minimo ?? null,
    }));

    stocks.sort((a: any, b: any) => (b.volume ?? 0) - (a.volume ?? 0));

    return new Response(JSON.stringify(stocks), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Failed to fetch stocks" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
};
