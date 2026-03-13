import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DATABASE_PATH ??
  path.resolve(__dirname, "../../../../data/plata.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database | null {
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
       WHERE a.lang = ? ORDER BY a.published_at DESC LIMIT ?`,
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
         WHERE a.lang = ? AND a.slug = ?`,
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
       WHERE a.lang = ? AND e.category = ?
       ORDER BY a.published_at DESC LIMIT ?`,
    )
    .all(lang, category, limit) as ArticleRow[];
}

export function getAllSlugs(): string[] {
  const db = getDb();
  if (!db) return [];
  return (db.prepare("SELECT DISTINCT slug FROM articles").all() as Array<{ slug: string }>).map(
    (r) => r.slug,
  );
}

export function getAllLangSlugPairs(): Array<{ lang: string; slug: string }> {
  const db = getDb();
  if (!db) return [];
  return db.prepare("SELECT lang, slug FROM articles").all() as Array<{ lang: string; slug: string }>;
}

// --- Helpers ---

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function readingTime(wordCount: number): string {
  const min = Math.max(1, Math.round(wordCount / 200));
  return `${min} min read`;
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

export function getBreakingNews(lang: string): ArticleRow | null {
  const db = getDb();
  if (!db) return null;
  return (
    (db
      .prepare(
        `SELECT a.*, e.category, e.importance_score
         FROM articles a JOIN events e ON a.event_id = e.id
         WHERE a.lang = ? AND a.published_at > datetime('now', '-12 hours')
         ORDER BY e.importance_score DESC
         LIMIT 1`,
      )
      .get(lang) as ArticleRow | undefined) ?? null
  );
}
