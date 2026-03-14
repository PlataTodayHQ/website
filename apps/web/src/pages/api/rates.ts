import type { APIRoute } from "astro";
import { BLUELYTICS_URL } from "@plata-today/shared";

export const prerender = false;

const DOLARAPI_URL = "https://dolarapi.com/v1/dolares";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const GET: APIRoute = async () => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cache.data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
          ...CORS_HEADERS,
        },
      });
    }

    const [blueRes, dolarRes] = await Promise.all([
      fetch(BLUELYTICS_URL),
      fetch(DOLARAPI_URL).catch(() => null),
    ]);

    if (!blueRes.ok) throw new Error(`Bluelytics ${blueRes.status}`);
    const blueData = await blueRes.json();

    // Extract MEP and CCL from dolarapi.com
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
    cache = { data, ts: Date.now() };

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
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
