import type { APIRoute } from "astro";
import {
  fetchT,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

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

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return jsonResponse(cache.data, 120);
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

    return jsonResponse(data, 120);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch crypto data");
  }
};
