import type { APIRoute } from "astro";
import { getDb } from "@/lib/db";
import { optionsResponse, jsonResponse, errorResponse } from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async ({ url }) => {
  try {
    const indicator = url.searchParams.get("indicator") || "country_risk";
    const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "90", 10), 1), 730);

    // Whitelist valid indicator names
    const validIndicators = [
      "country_risk", "bcra_rate", "bcra_reserves", "bcra_monetary_base",
      "plazo_fijo_tna", "badlar", "cer", "uva",
      "inflation_monthly", "inflation_annual",
    ];
    if (!validIndicators.includes(indicator)) {
      return errorResponse("Invalid indicator", 400);
    }

    const db = getDb();
    if (!db) return errorResponse("Service starting up", 503);

    const rows = db.prepare(
      `SELECT date, value
       FROM economic_indicators
       WHERE indicator = ? AND date >= date('now', '-' || ? || ' days')
       ORDER BY date ASC`,
    ).all(indicator, days) as Array<{ date: string; value: number }>;

    return jsonResponse(rows, 300, 600);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch economic history");
  }
};
