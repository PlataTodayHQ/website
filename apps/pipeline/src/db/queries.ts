import type Database from "better-sqlite3";

export function createQueries(db: Database.Database) {
  return {
    // --- Ingest ---
    insertRawArticle: db.prepare(`
      INSERT OR IGNORE INTO raw_articles
        (source_id, original_url, title, body, category, image_url, image_source, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `),

    getSourceByName: db.prepare<[string]>(`
      SELECT * FROM sources WHERE name = ?
    `),

    getAllSources: db.prepare(`SELECT * FROM sources WHERE is_active = 1`),

    // --- Clustering ---
    getUnprocessedRawArticles: db.prepare(`
      SELECT * FROM raw_articles WHERE is_processed = 0 ORDER BY scraped_at DESC
    `),

    getRecentClusteredArticles: db.prepare(`
      SELECT * FROM raw_articles
      WHERE is_processed = 1 AND cluster_id IS NOT NULL
        AND scraped_at > datetime('now', '-24 hours')
      ORDER BY scraped_at DESC
    `),

    setClusterId: db.prepare<[number, number]>(`
      UPDATE raw_articles SET cluster_id = ?, is_processed = 1 WHERE id = ?
    `),

    // --- Events ---
    insertEvent: db.prepare<[string, number]>(`
      INSERT INTO events (category, importance_score) VALUES (?, ?)
    `),

    getUnpublishedEvents: db.prepare<[number, number]>(`
      SELECT * FROM events
      WHERE is_published = 0 AND importance_score >= ?
      ORDER BY importance_score DESC
      LIMIT ?
    `),

    getAllUnpublishedEvents: db.prepare(`
      SELECT * FROM events WHERE is_published = 0
    `),

    updateEventScore: db.prepare<[number, number]>(`
      UPDATE events SET importance_score = ? WHERE id = ?
    `),

    updateEventCategory: db.prepare<[string, number]>(`
      UPDATE events SET category = ? WHERE id = ?
    `),

    markEventPublished: db.prepare<[number]>(`
      UPDATE events SET is_published = 1 WHERE id = ?
    `),

    // --- Raw articles for event ---
    getRawArticlesForEvent: db.prepare<[number]>(`
      SELECT ra.*, s.name as source_name, s.url as source_url
      FROM raw_articles ra
      JOIN sources s ON ra.source_id = s.id
      WHERE ra.cluster_id = ?
    `),

    // --- Articles ---
    insertArticle: db.prepare(`
      INSERT OR IGNORE INTO articles
        (event_id, lang, slug, title, body, meta_description, image_url, image_source,
         source_names, source_urls, word_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    getExistingArticleLangs: db.prepare<[number]>(`
      SELECT lang FROM articles WHERE event_id = ?
    `),

    // --- For Astro build ---
    getArticlesByLang: db.prepare<[string, number]>(`
      SELECT a.*, e.category, e.importance_score
      FROM articles a
      JOIN events e ON a.event_id = e.id
      WHERE a.lang = ?
      ORDER BY a.published_at DESC
      LIMIT ?
    `),

    getArticleByLangSlug: db.prepare<[string, string]>(`
      SELECT a.*, e.category, e.importance_score
      FROM articles a
      JOIN events e ON a.event_id = e.id
      WHERE a.lang = ? AND a.slug = ?
    `),

    getArticlesByCategory: db.prepare<[string, string, number]>(`
      SELECT a.*, e.category, e.importance_score
      FROM articles a
      JOIN events e ON a.event_id = e.id
      WHERE a.lang = ? AND e.category = ?
      ORDER BY a.published_at DESC
      LIMIT ?
    `),

    getAllSlugs: db.prepare(`SELECT DISTINCT slug FROM articles`),

    // --- Full-text enrichment ---
    getArticlesNeedingFullText: db.prepare(`
      SELECT id, original_url FROM raw_articles
      WHERE (body IS NULL OR length(body) < 100)
        AND scraped_at > datetime('now', '-48 hours')
      ORDER BY scraped_at DESC
    `),

    updateRawArticleBody: db.prepare<[string, number]>(`
      UPDATE raw_articles SET body = ? WHERE id = ?
    `),
  };
}

export type Queries = ReturnType<typeof createQueries>;
