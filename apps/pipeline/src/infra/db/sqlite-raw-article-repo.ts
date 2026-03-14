import type Database from "better-sqlite3";
import type { RawArticleEntity, NewRawArticle, SourceEntity } from "../../domain/entities.js";
import type { IRawArticleRepository } from "../../ports/raw-article-repository.js";

export class SQLiteRawArticleRepository implements IRawArticleRepository {
  private getUnprocessedStmt;
  private getRecentClusteredStmt;
  private setClusterIdStmt;
  private insertStmt;
  private getNeedingFullTextStmt;
  private updateBodyStmt;
  private getAllSourcesStmt;

  constructor(private db: Database.Database) {
    this.getUnprocessedStmt = db.prepare(
      `SELECT * FROM raw_articles WHERE is_processed = 0 ORDER BY scraped_at DESC`,
    );
    this.getRecentClusteredStmt = db.prepare(`
      SELECT * FROM raw_articles
      WHERE is_processed = 1 AND cluster_id IS NOT NULL
        AND scraped_at > datetime('now', '-24 hours')
      ORDER BY scraped_at DESC
    `);
    this.setClusterIdStmt = db.prepare(
      `UPDATE raw_articles SET cluster_id = ?, is_processed = 1 WHERE id = ?`,
    );
    this.insertStmt = db.prepare(`
      INSERT OR IGNORE INTO raw_articles
        (source_id, original_url, title, body, category, image_url, image_source, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.getNeedingFullTextStmt = db.prepare(`
      SELECT id, original_url FROM raw_articles
      WHERE length(body) < 500
        AND scraped_at > datetime('now', '-48 hours')
      ORDER BY scraped_at DESC
    `);
    this.updateBodyStmt = db.prepare(
      `UPDATE raw_articles SET body = ? WHERE id = ?`,
    );
    this.getAllSourcesStmt = db.prepare(
      `SELECT * FROM sources WHERE is_active = 1`,
    );
  }

  getUnprocessed(): RawArticleEntity[] {
    return this.getUnprocessedStmt.all() as RawArticleEntity[];
  }

  getRecentClustered(): RawArticleEntity[] {
    return this.getRecentClusteredStmt.all() as RawArticleEntity[];
  }

  setClusterId(articleId: number, clusterId: number): void {
    this.setClusterIdStmt.run(clusterId, articleId);
  }

  insert(article: NewRawArticle): boolean {
    const result = this.insertStmt.run(
      article.sourceId, article.url, article.title,
      article.body, article.category, article.imageUrl,
      article.imageSource, article.publishedAt,
    );
    return result.changes > 0;
  }

  getNeedingFullText(): Array<{ id: number; original_url: string }> {
    return this.getNeedingFullTextStmt.all() as Array<{ id: number; original_url: string }>;
  }

  updateBody(id: number, body: string): void {
    this.updateBodyStmt.run(body, id);
  }

  getAllSources(): SourceEntity[] {
    return this.getAllSourcesStmt.all() as SourceEntity[];
  }

  runInTransaction(fn: () => void): void {
    this.db.transaction(fn)();
  }
}
