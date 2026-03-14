import type { APIRoute } from "astro";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const prerender = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DATABASE_PATH ??
  path.resolve(__dirname, "../../../../../data/plata.db");

export const GET: APIRoute = async () => {
  const checks: Record<string, string> = {};
  let healthy = true;

  // DB check
  if (fs.existsSync(DB_PATH)) {
    try {
      const db = new Database(DB_PATH, { readonly: true });
      const row = db.prepare("SELECT COUNT(*) AS n FROM articles").get() as {
        n: number;
      };
      db.close();
      checks.db = `ok (${row.n} articles)`;
    } catch (e: any) {
      checks.db = `error: ${e.message}`;
      healthy = false;
    }
  } else {
    checks.db = "no database file";
  }

  // Uptime
  checks.uptime = `${Math.floor(process.uptime())}s`;

  return new Response(
    JSON.stringify({
      status: healthy ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status: healthy ? 200 : 503,
      headers: { "Content-Type": "application/json" },
    },
  );
};
