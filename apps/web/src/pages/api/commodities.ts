import type { APIRoute } from "astro";
import { fetchT } from "@plata-today/shared";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const SYMBOLS: Record<string, string> = {
  "GC=F": "Gold",
  "SI=F": "Silver",
  "CL=F": "Oil WTI",
};

let cache: { data: any; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

async function fetchYahoo(symbol: string) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`;
  let res = await fetchT(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    const fallback = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`;
    res = await fetchT(fallback, { headers: { "User-Agent": USER_AGENT } });
  }
  if (!res.ok) return null;
  const json: any = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  const price = meta.regularMarketPrice ?? null;
  const prev = meta.chartPreviousClose ?? null;
  return {
    symbol,
    name: SYMBOLS[symbol] ?? symbol,
    price,
    previousClose: prev,
    change: prev && prev > 0 ? ((price - prev) / prev) * 100 : null,
    currency: meta.currency ?? "USD",
  };
}

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

    const results = await Promise.all(
      Object.keys(SYMBOLS).map((s) => fetchYahoo(s)),
    );

    const data = results.filter(Boolean);
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
      JSON.stringify({ error: err.message ?? "Failed to fetch commodities" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
};
