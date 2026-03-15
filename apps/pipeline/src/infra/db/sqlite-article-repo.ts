import type Database from "better-sqlite3";
import type { ArticleEntity, NewArticle } from "../../domain/entities.js";
import type { IArticleRepository } from "../../ports/article-repository.js";

export class SQLiteArticleRepository implements IArticleRepository {
  private db;
  private insertStmt;
  private getSpanishStmt;
  private updateStmt;
  private getExistingLangsStmt;

  constructor(db: Database.Database) {
    this.db = db;
    this.insertStmt = db.prepare(`
      INSERT OR IGNORE INTO articles
        (event_id, lang, slug, title, body, meta_description, image_url, image_source,
         source_names, source_urls, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.getSpanishStmt = db.prepare(
      `SELECT * FROM articles WHERE event_id = ? AND lang = 'es'`,
    );
    this.updateStmt = db.prepare(
      `UPDATE articles SET title = ?, body = ?, meta_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    );
    this.getExistingLangsStmt = db.prepare(
      `SELECT lang FROM articles WHERE event_id = ?`,
    );
  }

  insert(article: NewArticle): void {
    this.insertStmt.run(
      article.eventId, article.lang, article.slug, article.title,
      article.body, article.metaDescription, article.imageUrl, article.imageSource,
      article.sourceNames, article.sourceUrls, article.wordCount,
    );
  }

  getSpanish(eventId: number): ArticleEntity | null {
    return (this.getSpanishStmt.get(eventId) as ArticleEntity) ?? null;
  }

  update(id: number, title: string, body: string, meta: string): void {
    this.updateStmt.run(title, body, meta, id);
  }

  getExistingLangs(eventId: number): string[] {
    return (this.getExistingLangsStmt.all(eventId) as Array<{ lang: string }>).map(
      (r) => r.lang,
    );
  }

  deleteByEventAndLang(eventId: number, lang: string): void {
    this.db.prepare(
      `DELETE FROM articles WHERE event_id = ? AND lang = ?`,
    ).run(eventId, lang);
  }

  hasSpanish(eventId: number): boolean {
    return this.getSpanishStmt.get(eventId) != null;
  }

  getRecentSpanishTitles(hours: number): Array<{ event_id: number; title: string }> {
    return this.db.prepare(
      `SELECT event_id, title FROM articles
       WHERE lang = 'es' AND published_at > datetime('now', '-' || ? || ' hours')`,
    ).all(hours) as Array<{ event_id: number; title: string }>;
  }
}
