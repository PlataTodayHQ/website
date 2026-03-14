import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../../pipeline/src/db/migrate.js";
import { startJobs, stopJobs } from "./jobs/scheduler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, "../../../data/plata.db");

const ASTRO_DIST = path.resolve(__dirname, "../../web/dist/server/entry.mjs");

async function start(): Promise<void> {
  console.log("[server] Starting plata.today unified server...");

  // 1. Run DB migrations
  console.log("[server] Running migrations...");
  runMigrations(DB_PATH);
  console.log("[server] Migrations complete");

  // 2. Start Astro server
  console.log("[server] Starting Astro server...");
  const { handler } = await import(ASTRO_DIST);
  const { createServer } = await import("node:http");

  const host = process.env.HOST ?? "0.0.0.0";
  const port = Number(process.env.PORT ?? "4321");

  const server = createServer(handler);
  server.listen(port, host, () => {
    console.log(`[server] Astro listening on http://${host}:${port}`);
  });

  // 3. Start background jobs
  console.log("[server] Starting background jobs...");
  startJobs(DB_PATH);

  // Graceful shutdown
  const shutdown = () => {
    console.log("[server] Shutting down...");
    stopJobs();
    server.close(() => {
      console.log("[server] Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});
