import type { APIRoute } from "astro";
import { getDb } from "@/lib/db";
import { optionsResponse, jsonResponse, errorResponse } from "@plata-today/shared";

export const prerender = false;

export const OPTIONS: APIRoute = () => optionsResponse();

export const GET: APIRoute = async ({ url }) => {
  try {
    const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10), 1), 180);

    const db = getDb();
    if (!db) return errorResponse("Service starting up", 503);

    const rows = db.prepare(
      `SELECT date, rate_type, buy, sell, source
       FROM exchange_rate_history
       WHERE date >= date('now', '-' || ? || ' days')
       ORDER BY date ASC, rate_type`,
    ).all(days) as Array<{
      date: string;
      rate_type: string;
      buy: number;
      sell: number;
      source: string;
    }>;

    // Group by date for easier client consumption
    const byDate = new Map<string, Record<string, { buy: number; sell: number }>>();
    for (const row of rows) {
      if (!byDate.has(row.date)) byDate.set(row.date, {});
      byDate.get(row.date)![row.rate_type] = { buy: row.buy, sell: row.sell };
    }

    const data = Array.from(byDate.entries()).map(([date, rates]) => ({
      date,
      ...rates,
    }));

    return jsonResponse(data, 300, 600);
  } catch (err: any) {
    return errorResponse(err.message ?? "Failed to fetch rate history");
  }
};
