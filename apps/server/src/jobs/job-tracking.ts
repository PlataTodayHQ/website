import type Database from "better-sqlite3";

export function recordJobStart(db: Database.Database, jobName: string): number {
  try {
    const result = db
      .prepare("INSERT INTO job_runs (job_name, status) VALUES (?, 'running')")
      .run(jobName);
    return Number(result.lastInsertRowid);
  } catch {
    return 0;
  }
}

export function recordJobEnd(
  db: Database.Database,
  runId: number,
  status: string,
  error?: string,
): void {
  if (!runId) return;
  try {
    db.prepare(
      "UPDATE job_runs SET status = ?, error_message = ?, finished_at = datetime('now') WHERE id = ?",
    ).run(status, error ?? null, runId);
  } catch {
    // non-critical
  }
}
