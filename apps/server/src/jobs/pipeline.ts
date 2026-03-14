let running = false;

export async function runPipeline(dbPath: string): Promise<void> {
  if (running) {
    console.log("[pipeline] Already running, skipping");
    return;
  }

  running = true;
  console.log("[pipeline] Starting pipeline run...");

  try {
    // Set env vars that pipeline expects
    process.env.DATABASE_PATH = dbPath;

    const { main } = await import("../../../pipeline/src/main.js");
    await main();
    console.log("[pipeline] Pipeline run complete");
  } catch (err) {
    console.error("[pipeline] Pipeline error:", err);
  } finally {
    running = false;
  }
}
