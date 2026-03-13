import { exec } from "node:child_process";
import { promisify } from "node:util";
import { log } from "./logger.js";

const execAsync = promisify(exec);

export async function triggerRebuild(command: string): Promise<boolean> {
  log.info("Triggering site rebuild", { command });
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 300_000, // 5 minutes max
    });
    if (stderr) {
      log.warn("Rebuild stderr", { stderr: stderr.slice(0, 500) });
    }
    log.info("Rebuild complete");
    return true;
  } catch (err) {
    log.error("Rebuild failed", { error: String(err) });
    return false;
  }
}
