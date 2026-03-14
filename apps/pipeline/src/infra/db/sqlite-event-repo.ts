import type Database from "better-sqlite3";
import type { EventEntity, RawArticleEntity } from "../../domain/entities.js";
import type { IEventRepository } from "../../ports/event-repository.js";

export class SQLiteEventRepository implements IEventRepository {
  private db;
  private getByStageStmt;
  private getAllUnpublishedStmt;
  private insertEventStmt;
  private getRawArticlesStmt;
  private updateScoreStmt;
  private updateCategoryStmt;
  private setStageStmt;
  private triageStmt;
  private killStmt;
  private incrementReviewAttemptsStmt;

  constructor(db: Database.Database) {
    this.db = db;
    this.getByStageStmt = db.prepare(
      `SELECT * FROM events WHERE stage = ? ORDER BY importance_score DESC`,
    );
    this.getAllUnpublishedStmt = db.prepare(
      `SELECT * FROM events WHERE is_published = 0`,
    );
    this.insertEventStmt = db.prepare(
      `INSERT INTO events (category, importance_score) VALUES (?, ?)`,
    );
    this.getRawArticlesStmt = db.prepare(`
      SELECT ra.*, s.name as source_name, s.url as source_url
      FROM raw_articles ra
      JOIN sources s ON ra.source_id = s.id
      WHERE ra.cluster_id = ?
    `);
    this.updateScoreStmt = db.prepare(
      `UPDATE events SET importance_score = ? WHERE id = ?`,
    );
    this.updateCategoryStmt = db.prepare(
      `UPDATE events SET category = ? WHERE id = ?`,
    );
    this.setStageStmt = db.prepare(
      `UPDATE events SET stage = ? WHERE id = ?`,
    );
    this.triageStmt = db.prepare(`
      UPDATE events
      SET llm_importance = ?, llm_category = ?, category = ?, triage_reason = ?, stage = 'triaged', importance_score = ?
      WHERE id = ?
    `);
    this.killStmt = db.prepare(`
      UPDATE events
      SET llm_importance = ?, triage_reason = ?, stage = 'killed'
      WHERE id = ?
    `);
    this.incrementReviewAttemptsStmt = db.prepare(
      `UPDATE events SET review_attempts = COALESCE(review_attempts, 0) + 1 WHERE id = ?`,
    );
  }

  getByStage(stage: string): EventEntity[] {
    return this.getByStageStmt.all(stage) as EventEntity[];
  }

  killStaleNewEvents(staleHours: number): number {
    const result = this.db.prepare(
      `UPDATE events SET stage = 'killed', triage_reason = 'Stale — older than ' || ? || 'h'
       WHERE stage = 'new' AND created_at < datetime('now', '-' || ? || ' hours')`,
    ).run(staleHours, staleHours);
    return result.changes;
  }

  getAllUnpublished(): EventEntity[] {
    return this.getAllUnpublishedStmt.all() as EventEntity[];
  }

  create(category: string, score: number): number {
    const result = this.insertEventStmt.run(category, score);
    return Number(result.lastInsertRowid);
  }

  getRawArticles(eventId: number): RawArticleEntity[] {
    return this.getRawArticlesStmt.all(eventId) as RawArticleEntity[];
  }

  updateScore(id: number, score: number): void {
    this.updateScoreStmt.run(score, id);
  }

  updateCategory(id: number, category: string): void {
    this.updateCategoryStmt.run(category, id);
  }

  setStage(id: number, stage: string): void {
    this.setStageStmt.run(stage, id);
  }

  triage(id: number, importance: number, category: string, reason: string): void {
    this.triageStmt.run(importance, category, category, reason, importance, id);
  }

  kill(id: number, importance: number, reason: string): void {
    this.killStmt.run(importance, reason, id);
  }

  incrementReviewAttempts(id: number): void {
    this.incrementReviewAttemptsStmt.run(id);
  }
}
