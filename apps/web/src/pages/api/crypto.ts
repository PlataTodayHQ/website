import type { APIRoute } from "astro";
import {
  fetchT,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async ({ url }) => {
  try {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 250);

    if (cache && cache.data?.length >= limit && Date.now() - cache.ts < CACHE_TTL) {
      return jsonResponse(cache.data.slice(0, limit), 120);
    }

    // Try CoinGecko first (has market cap, volume, images, supply, 7d change)
    const cgUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h,7d`;
    const cgRes = await fetchT(cgUrl);

    if (cgRes.ok) {
      const raw: any[] = await cgRes.json();
      const data = raw.map((coin: any, i: number) => ({
        rank: i + 1,
        symbol: (coin.symbol || "").toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: coin.price_change_percentage_24h,
        change7d: coin.price_change_percentage_7d_in_currency ?? null,
        marketCap: coin.market_cap,
        volume: coin.total_volume,
        circulatingSupply: coin.circulating_supply ?? null,
        totalSupply: coin.total_supply ?? null,
        maxSupply: coin.max_supply ?? null,
        ath: coin.ath ?? null,
        athChangePercentage: coin.ath_change_percentage ?? null,
        image: coin.image,
        id: coin.id,
        sparkline: coin.sparkline_in_7d?.price ?? null,
      }));
      cache = { data, ts: Date.now() };
      return jsonResponse(data.slice(0, limit), 120);
    }

    // Fallback to Binance (top 10 only, no market cap)
    const TOP_SYMBOLS = [
      "BTCUSDT", "ETHUSDT", "XRPUSDT", "BNBUSDT", "SOLUSDT",
      "ADAUSDT", "DOGEUSDT", "TRXUSDT", "AVAXUSDT", "LINKUSDT",
    ];
    const DISPLAY_NAMES: Record<string, string> = {
      BTCUSDT: "BTC", ETHUSDT: "ETH", XRPUSDT: "XRP", BNBUSDT: "BNB",
      SOLUSDT: "SOL", ADAUSDT: "ADA", DOGEUSDT: "DOGE", TRXUSDT: "TRX",
      AVAXUSDT: "AVAX", LINKUSDT: "LINK",
    };

    const symbols = JSON.stringify(TOP_SYMBOLS);
    const res = await fetchT(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`,
    );
    if (!res.ok) throw new Error(`Binance ${res.status}`);
    const binanceRaw: any[] = await res.json();

    const bySymbol = new Map(binanceRaw.map((r: any) => [r.symbol, r]));
    const data = TOP_SYMBOLS.map((sym, i) => {
      const t = bySymbol.get(sym);
      if (!t) return null;
      return {
        rank: i + 1,
        symbol: DISPLAY_NAMES[sym] ?? sym,
        name: DISPLAY_NAMES[sym] ?? sym,
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
        marketCap: null,
        volume: parseFloat(t.quoteVolume),
        image: null,
        id: null,
      };
    }).filter(Boolean);

    cache = { data, ts: Date.now() };
    return jsonResponse(data, 120);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch crypto data");
  }
};
