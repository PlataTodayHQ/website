import type { APIRoute } from "astro";

export const prerender = false;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y"];
const VALID_INTERVALS = ["5m", "15m", "30m", "1h", "1d", "1wk", "1mo"];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const rawSymbol = params.symbol ?? "";

    if (!rawSymbol) {
      return new Response(
        JSON.stringify({ error: "Missing symbol parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        },
      );
    }

    if (!/^[\w.\-^]+$/.test(rawSymbol)) {
      return new Response(JSON.stringify({ error: "Invalid symbol" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    let symbol = rawSymbol;
    if (!symbol.startsWith("^") && !symbol.includes(".")) {
      symbol = `${symbol}.BA`;
    }

    const range = VALID_RANGES.includes(url.searchParams.get("range") ?? "")
      ? url.searchParams.get("range")!
      : "1mo";
    const interval = VALID_INTERVALS.includes(
      url.searchParams.get("interval") ?? "",
    )
      ? url.searchParams.get("interval")!
      : "1d";

    const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
    let res = await fetch(yahooUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) {
      const fallbackUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
      res = await fetch(fallbackUrl, {
        headers: { "User-Agent": USER_AGENT },
      });
    }

    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const json: any = await res.json();

    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("No chart data");

    const meta = result.meta ?? {};
    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const price = meta.regularMarketPrice ?? null;
    const prev = meta.chartPreviousClose ?? null;

    const data = {
      symbol: rawSymbol,
      yahooSymbol: symbol,
      name: meta.shortName ?? meta.longName ?? rawSymbol,
      currency: meta.currency ?? "ARS",
      price,
      previousClose: prev,
      variation: prev && prev > 0 ? (price - prev) / prev : null,
      timestamps,
      closes: quote.close ?? [],
      volumes: quote.volume ?? [],
      highs: quote.high ?? [],
      lows: quote.low ?? [],
      opens: quote.open ?? [],
    };

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
        error: err.message ?? "Failed to fetch stock data",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      },
    );
  }
};
