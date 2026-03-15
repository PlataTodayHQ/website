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
    const [blueRes, dolarRes] = await Promise.all([
      fetchT(BLUELYTICS_URL),
      fetchT(DOLARAPI_URL).catch(() => null),
    ]);

    if (!blueRes.ok) throw new Error(`Bluelytics ${blueRes.status}`);
    const blueData = await blueRes.json();

    let mep: { value_buy: number; value_sell: number } | null = null;
    let ccl: { value_buy: number; value_sell: number } | null = null;

    if (dolarRes && dolarRes.ok) {
      const dolares = await dolarRes.json();
      for (const d of dolares) {
        if (d.casa === "bolsa") {
          mep = { value_buy: d.compra, value_sell: d.venta };
        } else if (d.casa === "contadoconliqui") {
          ccl = { value_buy: d.compra, value_sell: d.venta };
        }
      }
    }

    const data = { ...blueData, mep, ccl };

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
