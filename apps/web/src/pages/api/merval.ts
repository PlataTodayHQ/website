import type { APIRoute } from "astro";

export const prerender = false;

const BYMA_URL =
  "https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/index-price";
const YAHOO_URL =
  "https://query1.finance.yahoo.com/v8/finance/chart/%5EMERV?interval=1d&range=1d";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function fetchBYMA() {
  const res = await fetch(BYMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error(`BYMA ${res.status}`);
  const json: any = await res.json();
  if (!json?.data) throw new Error("BYMA: no data");

  const m = json.data.find((d: any) => d.symbol === "M");
  if (!m) throw new Error("BYMA: Merval not found");

  return {
    price: m.price,
    high: m.highPrice ?? m.high ?? null,
    low: m.lowPrice ?? m.low ?? null,
    previousClose: m.previousClosingPrice ?? null,
    variation: m.variation ?? null,
    volume: m.volume ?? null,
    source: "BYMA",
  };
}

async function fetchYahoo() {
  const res = await fetch(YAHOO_URL);
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const json: any = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("Yahoo: no meta");

  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose;

  return {
    price,
    high: null,
    low: null,
    previousClose: prev,
    variation: prev > 0 ? (price - prev) / prev : null,
    volume: null,
    source: "Yahoo",
  };
}

export const GET: APIRoute = async () => {
  try {
    let data;
    try {
      data = await fetchBYMA();
    } catch {
      data = await fetchYahoo();
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
        error: err.message ?? "Failed to fetch Merval data",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
};
