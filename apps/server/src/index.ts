import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../../pipeline/src/db/migrate.js";
import { startJobs, stopJobs } from "./jobs/scheduler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, "../../../data/plata.db");

const ASTRO_DIST = path.resolve(__dirname, "../../web/dist/server/entry.mjs");
const DIST_CLIENT = path.resolve(__dirname, "../../web/dist/client");

async function start(): Promise<void> {
  console.log("[server] Starting plata.today unified server...");

  // 1. Run DB migrations
  console.log("[server] Running migrations...");
  runMigrations(DB_PATH);
  console.log("[server] Migrations complete");

  // 2. Start Astro server (standalone mode auto-binds to HOST:PORT)
  console.log("[server] Starting Astro server...");
  await import(ASTRO_DIST);

  // 3. Start background jobs
  console.log("[server] Starting background jobs...");
  startJobs(DB_PATH, DIST_CLIENT);

  // Graceful shutdown
  const shutdown = () => {
    console.log("[server] Shutting down...");
    stopJobs();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// Prevent silent crashes from unhandled async errors
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err);
  process.exit(1);
});

start().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});
