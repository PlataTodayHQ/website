import { recordJobStart, recordJobEnd } from "./job-tracking.js";

let running = false;

export async function runPipeline(dbPath: string): Promise<void> {
  if (running) {
    console.log("[pipeline] Already running, skipping");
    return;
  }

  running = true;
  console.log("[pipeline] Starting pipeline run...");

  const runId = recordJobStart(dbPath, "pipeline");

  try {
    const { main } = await import("@plata-today/pipeline");
    await main(dbPath);
    console.log("[pipeline] Pipeline run complete");
    recordJobEnd(dbPath, runId, "success");
  } catch (err) {
    console.error("[pipeline] Pipeline error:", err);
    recordJobEnd(dbPath, runId, "error", String(err));
  } finally {
    running = false;
  }
}
