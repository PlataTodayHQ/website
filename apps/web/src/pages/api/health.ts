import type { APIRoute } from "astro";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getDataAge } from "@plata-today/shared";

export const prerender = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DATABASE_PATH ??
  path.resolve(__dirname, "../../../../../data/plata.db");

interface FreshnessRow { table_name: string; latest: string; count: number }

export const GET: APIRoute = async () => {
  const checks: Record<string, unknown> = {};
  let healthy = true;

  // DB check + data freshness
  if (fs.existsSync(DB_PATH)) {
    try {
      const db = new Database(DB_PATH, { readonly: true });

      const articleCount = (db.prepare("SELECT COUNT(*) AS n FROM articles").get() as { n: number }).n;
      checks.db = `ok (${articleCount} articles)`;

      // DB file size
      const stats = fs.statSync(DB_PATH);
      const dbSizeMB = Math.round(stats.size / 1024 / 1024);
      checks.dbSize = `${dbSizeMB} MB`;
      if (dbSizeMB > 500) {
        checks.dbWarning = "DB exceeds 500 MB";
      }

      // Data freshness per table
      const freshnessTables = [
        { name: "stock_prices", col: "fetched_at" },
        { name: "merval_snapshots", col: "fetched_at" },
        { name: "exchange_rates", col: "fetched_at" },
        { name: "stock_fundamentals", col: "fetched_at" },
        { name: "financial_statements", col: "fetched_at" },
      ];

      const freshness: Record<string, { latest: string; count: number; ageMinutes: number }> = {};
      for (const { name, col } of freshnessTables) {
        try {
          const row = db.prepare(
            `SELECT MAX(${col}) AS latest, COUNT(*) AS count FROM ${name}`,
          ).get() as FreshnessRow;
          if (row?.latest) {
            const ageMs = Date.now() - new Date(row.latest + "Z").getTime();
            freshness[name] = {
              latest: row.latest,
              count: row.count,
              ageMinutes: Math.round(ageMs / 60000),
            };
          }
        } catch {
          // table may not exist yet
        }
      }
      checks.freshness = freshness;

      db.close();
    } catch (e: any) {
      checks.db = `error: ${e.message}`;
      healthy = false;
    }
  } else {
    checks.db = "no database file";
    healthy = false;
  }

  // In-memory store ages
  const storeAge: Record<string, string> = {};
  for (const key of ["merval", "rates", "stocks"] as const) {
    const age = getDataAge(key);
    storeAge[key] = age != null ? `${Math.round(age / 1000)}s ago` : "no data";
  }
  checks.memoryStore = storeAge;

  // Uptime + memory
  checks.uptime = `${Math.floor(process.uptime())}s`;
  const mem = process.memoryUsage();
  checks.memory = {
    rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
  };

  return new Response(
    JSON.stringify({
      status: healthy ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status: healthy ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    },
  );
};
