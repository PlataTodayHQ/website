import type { APIRoute } from "astro";
import {
  toYahooSymbol, fetchYahooChart,
  optionsResponse, jsonResponse, errorResponse,
} from "@plata-today/shared";
import { getDb } from "@/lib/db";

export const prerender = false;

const VALID_RANGES = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y"];
const VALID_INTERVALS = ["5m", "15m", "30m", "1h", "1d", "1wk", "1mo"];

/** Map range strings to SQLite day offsets. */
const RANGE_DAYS: Record<string, number> = {
  "1d": 1, "5d": 5, "1mo": 30, "3mo": 90,
  "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
};

export const OPTIONS: APIRoute = () => optionsResponse();

function getDbCandles(symbol: string, interval: string, range: string) {
  const db = getDb();
  if (!db) return null;

  const days = RANGE_DAYS[range] ?? 30;

  const rows = db.prepare(
    `SELECT timestamp, open, high, low, close, volume
     FROM stock_candles
     WHERE symbol = ? AND interval = ?
       AND timestamp > unixepoch('now', '-' || ? || ' days')
     ORDER BY timestamp ASC`,
  ).all(symbol, interval, days) as Array<{
    timestamp: number; open: number | null; high: number | null;
    low: number | null; close: number | null; volume: number | null;
  }>;

  return rows.length > 0 ? rows : null;
}

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const rawSymbol = decodeURIComponent(params.symbol ?? "");

    if (!rawSymbol) {
      return errorResponse("Missing symbol parameter", 400);
    }

    if (!/^[\w.\-^=]+$/.test(rawSymbol)) {
      return errorResponse("Invalid symbol", 400);
    }

    const range = VALID_RANGES.includes(url.searchParams.get("range") ?? "")
      ? url.searchParams.get("range")!
      : "1mo";
    const interval = VALID_INTERVALS.includes(
      url.searchParams.get("interval") ?? "",
    )
      ? url.searchParams.get("interval")!
      : "1d";

    // Try DB candles first (aggregated from BYMA data)
    const dbCandles = getDbCandles(rawSymbol, interval, range);
    if (dbCandles) {
      const lastCandle = dbCandles[dbCandles.length - 1];
      const firstCandle = dbCandles[0];
      const price = lastCandle.close ?? lastCandle.open ?? 0;
      const prev = firstCandle.open ?? price;

      return jsonResponse({
        symbol: rawSymbol,
        name: rawSymbol,
        currency: "ARS",
        price,
        previousClose: prev,
        variation: prev && prev > 0 ? (price - prev) / prev : null,
        timestamps: dbCandles.map((c) => c.timestamp),
        closes: dbCandles.map((c) => c.close),
        volumes: dbCandles.map((c) => c.volume),
        highs: dbCandles.map((c) => c.high),
        lows: dbCandles.map((c) => c.low),
        opens: dbCandles.map((c) => c.open),
        source: "BYMA",
      }, 300);
    }

    // Fallback to Yahoo for symbols not in DB (international, commodities)
    const symbol = toYahooSymbol(rawSymbol);
    const result = await fetchYahooChart(symbol, interval, range);
    if (!result) throw new Error("No chart data");

    const meta = result.meta ?? {};
    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const price = meta.regularMarketPrice ?? null;
    const prev = meta.chartPreviousClose ?? null;

    return jsonResponse({
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
      source: "Yahoo",
    }, 300);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch stock data");
  }
};
