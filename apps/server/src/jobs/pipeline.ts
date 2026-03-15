import type Database from "better-sqlite3";
import { recordJobStart, recordJobEnd } from "./job-tracking.js";

let running = false;

export async function runPipeline(db: Database.Database): Promise<void> {
  if (running) {
    console.log("[pipeline] Already running, skipping");
    return;
  }

  running = true;
  console.log("[pipeline] Starting pipeline run...");

  const runId = recordJobStart(db, "pipeline");

  try {
    // Pipeline still needs its own DB path for its internal connection management
    const dbPath = db.name;
    const { main } = await import("@plata-today/pipeline");
    await main(dbPath);
    console.log("[pipeline] Pipeline run complete");
    recordJobEnd(db, runId, "success");
  } catch (err) {
    console.error("[pipeline] Pipeline error:", err);
    recordJobEnd(db, runId, "error", String(err));
  } finally {
    running = false;
  }
}
