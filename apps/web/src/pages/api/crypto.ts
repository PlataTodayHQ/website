import type { APIRoute } from "astro";
import { fetchT } from "@plata-today/shared";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000;

// Top 10 crypto symbols on Binance (by market cap, stable ordering)
const TOP_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "XRPUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "TRXUSDT",
  "AVAXUSDT",
  "LINKUSDT",
];

const DISPLAY_NAMES: Record<string, string> = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  XRPUSDT: "XRP",
  BNBUSDT: "BNB",
  SOLUSDT: "SOL",
  ADAUSDT: "ADA",
  DOGEUSDT: "DOGE",
  TRXUSDT: "TRX",
  AVAXUSDT: "AVAX",
  LINKUSDT: "LINK",
};

export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const GET: APIRoute = async () => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cache.data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=120",
          ...CORS_HEADERS,
        },
      });
    }

    const symbols = JSON.stringify(TOP_SYMBOLS);
    const res = await fetchT(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`,
    );
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const raw: any[] = await res.json();

    // Maintain our ordering
    const bySymbol = new Map(raw.map((r: any) => [r.symbol, r]));
    const data = TOP_SYMBOLS.map((sym) => {
      const t = bySymbol.get(sym);
      if (!t) return null;
      return {
        symbol: DISPLAY_NAMES[sym] ?? sym,
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
      };
    }).filter(Boolean);

    cache = { data, ts: Date.now() };

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=120",
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Failed to fetch crypto data" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
};
