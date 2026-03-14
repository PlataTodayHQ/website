import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DATABASE_PATH ??
  path.resolve(__dirname, "../../../../data/plata.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database | null {
  if (_db) return _db;
  if (!fs.existsSync(DB_PATH)) return null;

  _db = new Database(DB_PATH, { readonly: true });
  _db.pragma("journal_mode = WAL");
  return _db;
}

// --- Article row from DB ---
export interface ArticleRow {
  id: number;
  event_id: number;
  lang: string;
  slug: string;
  title: string;
  body: string;
  meta_description: string | null;
  image_url: string | null;
  image_source: string | null;
  source_names: string; // JSON array
  source_urls: string; // JSON array
  word_count: number;
  published_at: string;
  category: string;
  importance_score: number;
}

export function getArticlesByLang(
  lang: string,
  limit = 50,
): ArticleRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare(
      `SELECT a.*, e.category, e.importance_score
       FROM articles a JOIN events e ON a.event_id = e.id
       WHERE a.lang = ? AND e.stage = 'published'
       ORDER BY a.published_at DESC LIMIT ?`,
    )
    .all(lang, limit) as ArticleRow[];
}

export function getArticleBySlug(
  lang: string,
  slug: string,
): ArticleRow | null {
  const db = getDb();
  if (!db) return null;
  return (
    (db
      .prepare(
        `SELECT a.*, e.category, e.importance_score
         FROM articles a JOIN events e ON a.event_id = e.id
         WHERE a.lang = ? AND a.slug = ? AND e.stage = 'published'`,
      )
      .get(lang, slug) as ArticleRow | undefined) ?? null
  );
}

export function getArticlesByCategory(
  lang: string,
  category: string,
  limit = 20,
): ArticleRow[] {
  const db = getDb();
  if (!db) return [];
  return db
    .prepare(
      `SELECT a.*, e.category, e.importance_score
       FROM articles a JOIN events e ON a.event_id = e.id
       WHERE a.lang = ? AND e.category = ? AND e.stage = 'published'
       ORDER BY a.published_at DESC LIMIT ?`,
    )
    .all(lang, category, limit) as ArticleRow[];
}


export function getArticleLangSlugs(eventId: number): Record<string, string> {
  const db = getDb();
  if (!db) return {};
  const rows = db
    .prepare("SELECT lang, slug FROM articles WHERE event_id = ?")
    .all(eventId) as Array<{ lang: string; slug: string }>;
  const result: Record<string, string> = {};
  for (const r of rows) result[r.lang] = r.slug;
  return result;
}

// --- Helpers ---

export function timeAgo(dateStr: string, lang = "en"): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  try {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    if (diffMin < 1) return rtf.format(0, "minute");
    if (diffMin < 60) return rtf.format(-diffMin, "minute");
    if (diffHr < 24) return rtf.format(-diffHr, "hour");
    if (diffDay < 7) return rtf.format(-diffDay, "day");
  } catch {
    // fallback below
  }
  return new Date(dateStr).toLocaleDateString(lang, {
    month: "short",
    day: "numeric",
  });
}

export function readingTime(wordCount: number, _lang = "en"): string {
  const min = Math.max(1, Math.round(wordCount / 200));
  return `${min} min`;
}

export function parseSourceNames(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function parseSourceUrls(json: string): string[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

export function getArticlesFeed(
  lang: string,
  offset = 0,
  limit = 20,
  category?: string,
): { articles: ArticleRow[]; hasMore: boolean } {
  const db = getDb();
  if (!db) return { articles: [], hasMore: false };
  const params: any[] = [lang];
  let where = "a.lang = ? AND e.stage = 'published'";
  if (category) {
    where += " AND e.category = ?";
    params.push(category);
  }
  params.push(limit + 1, offset);
  const rows = db
    .prepare(
      `SELECT a.*, e.category, e.importance_score
       FROM articles a JOIN events e ON a.event_id = e.id
       WHERE ${where}
       ORDER BY a.published_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params) as ArticleRow[];
  const hasMore = rows.length > limit;
  return { articles: rows.slice(0, limit), hasMore };
}

export function getBreakingNews(lang: string): ArticleRow | null {
  const db = getDb();
  if (!db) return null;
  return (
    (db
      .prepare(
        `SELECT a.*, e.category, e.importance_score
         FROM articles a JOIN events e ON a.event_id = e.id
         WHERE a.lang = ? AND e.stage = 'published'
           AND a.published_at > datetime('now', '-12 hours')
         ORDER BY e.importance_score DESC
         LIMIT 1`,
      )
      .get(lang) as ArticleRow | undefined) ?? null
  );
}
