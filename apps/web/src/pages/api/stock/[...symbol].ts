import type { APIRoute } from "astro";
import {
  toYahooSymbol, fetchYahooChart,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";

export const prerender = false;

const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y"];
const VALID_INTERVALS = ["5m", "15m", "30m", "1h", "1d", "1wk", "1mo"];

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const rawSymbol = params.symbol ?? "";

    if (!rawSymbol) {
      return errorResponse("Missing symbol parameter", 400);
    }

    if (!/^[\w.\-^=]+$/.test(rawSymbol)) {
      return errorResponse("Invalid symbol", 400);
    }

    const symbol = toYahooSymbol(rawSymbol);

    const range = VALID_RANGES.includes(url.searchParams.get("range") ?? "")
      ? url.searchParams.get("range")!
      : "1mo";
    const interval = VALID_INTERVALS.includes(
      url.searchParams.get("interval") ?? "",
    )
      ? url.searchParams.get("interval")!
      : "1d";

    const result = await fetchYahooChart(symbol, interval, range);
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

    return jsonResponse(data, 300);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch stock data");
  }
};
