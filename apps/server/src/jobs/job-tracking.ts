import Database from "better-sqlite3";

export function recordJobStart(dbPath: string, jobName: string): number {
  try {
    const db = new Database(dbPath);
    const result = db
      .prepare("INSERT INTO job_runs (job_name, status) VALUES (?, 'running')")
      .run(jobName);
    db.close();
    return Number(result.lastInsertRowid);
  } catch {
    return 0;
  }
}

export function recordJobEnd(
  dbPath: string,
  runId: number,
  status: string,
  error?: string,
): void {
  if (!runId) return;
  try {
    const db = new Database(dbPath);
    db.prepare(
      "UPDATE job_runs SET status = ?, error_message = ?, finished_at = datetime('now') WHERE id = ?",
    ).run(status, error ?? null, runId);
    db.close();
  } catch {
    // non-critical
  }
}
