import type { APIRoute } from "astro";
import { BLUELYTICS_URL, fetchT, getRates } from "@plata-today/shared";

export const prerender = false;

const DOLARAPI_URL = "https://dolarapi.com/v1/dolares";

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
    const cached = getRates();
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
    // Primary: dolarapi.com — all rates in one call
    let data: any;
    try {
      const res = await fetchT(DOLARAPI_URL);
      if (!res.ok) throw new Error(`dolarapi ${res.status}`);
      const dolares: any[] = await res.json();
      const rates: Record<string, any> = { blue: null, oficial: null, mep: null, ccl: null };
      for (const d of dolares) {
        const pair = { value_buy: d.compra, value_sell: d.venta };
        if (d.casa === "blue") rates.blue = pair;
        else if (d.casa === "oficial") rates.oficial = pair;
        else if (d.casa === "bolsa") rates.mep = pair;
        else if (d.casa === "contadoconliqui") rates.ccl = pair;
      }
      data = rates;
    } catch {
      // Fallback: Bluelytics — only blue + oficial
      const res = await fetchT(BLUELYTICS_URL);
      if (!res.ok) throw new Error(`Bluelytics ${res.status}`);
      const blueData = await res.json();
      data = { ...blueData, mep: null, ccl: null };
    }

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err.message ?? "Failed to fetch exchange rates",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
};
