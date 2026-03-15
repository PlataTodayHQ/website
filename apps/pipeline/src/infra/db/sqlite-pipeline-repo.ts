import type Database from "better-sqlite3";
import type { PipelineMetrics } from "../../domain/metrics.js";

export class SQLitePipelineRepository {
  private db;

  constructor(db: Database.Database) {
    this.db = db;
  }

  saveRun(metrics: PipelineMetrics, durationSec: number): void {
    const rec = metrics.toRecord();
    this.db.prepare(`
      INSERT INTO pipeline_runs
        (finished_at, duration_sec, scraped, inserted, enriched, new_clusters,
         triaged, killed_triage, drafted, reviewed_pass, reviewed_fail,
         rewrites_created, rewrites_failed, published,
         llm_calls, llm_errors, prompt_tokens, completion_tokens)
      VALUES (CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      durationSec,
      rec.scraped, rec.inserted, rec.enriched, rec.new_clusters,
      rec.triaged, rec.killed_triage, rec.drafted, rec.reviewed_pass, rec.reviewed_fail,
      rec.rewrites_created, rec.rewrites_failed, rec.published,
      rec.llm_calls, rec.llm_errors, rec.prompt_tokens, rec.completion_tokens,
    );
  }
}
