import type { APIRoute } from "astro";
import { getDb } from "@/lib/db";
import { optionsResponse, jsonResponse, errorResponse } from "@plata-today/shared";

export const prerender = false;

interface ScreenerRow {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  price: number | null;
  change: number | null;
  opening_price: number | null;
  previous_close: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  market_cap: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  eps: number | null;
  dividend_yield: number | null;
  beta: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  recommendation_key: string | null;
}

const SCREENER_SQL = `
  SELECT
    sp.symbol,
    COALESCE(sc.name, sp.symbol) AS name,
    sc.sector,
    sc.industry,
    sp.price,
    sp.variation AS change,
    sp.opening_price,
    sp.previous_close,
    sp.high,
    sp.low,
    sp.volume,
    sf.market_cap,
    sf.trailing_pe,
    sf.forward_pe,
    sf.eps,
    sf.dividend_yield,
    sf.beta,
    sf.fifty_two_week_high,
    sf.fifty_two_week_low,
    sf.recommendation_key
  FROM stock_prices sp
  LEFT JOIN stock_companies sc ON sp.symbol = sc.symbol
  LEFT JOIN stock_fundamentals sf ON sp.symbol = sf.symbol
    AND sf.id = (
      SELECT id FROM stock_fundamentals sf2
      WHERE sf2.symbol = sp.symbol
      ORDER BY sf2.fetched_at DESC LIMIT 1
    )
  WHERE sp.id IN (
    SELECT MAX(id) FROM stock_prices GROUP BY symbol
  )
  ORDER BY COALESCE(sf.market_cap, 0) DESC
`;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async () => {
  try {
    const db = getDb();
    if (!db) {
      return errorResponse("Service starting up, please retry", 503);
    }

    const rows = db.prepare(SCREENER_SQL).all() as ScreenerRow[];
    if (rows.length === 0) {
      return errorResponse("No stock data available yet", 503);
    }

    return jsonResponse(rows, 120);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch screener data");
  }
};
