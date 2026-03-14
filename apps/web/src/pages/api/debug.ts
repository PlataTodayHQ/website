import type { APIRoute } from "astro";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const prerender = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DATABASE_PATH ??
  path.resolve(__dirname, "../../../../../data/plata.db");

export const GET: APIRoute = async () => {
  if (!fs.existsSync(DB_PATH)) {
    return new Response(JSON.stringify({ error: "no database file" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = new Database(DB_PATH, { readonly: true });

  try {
    const stages = db
      .prepare("SELECT stage, COUNT(*) as count FROM events GROUP BY stage")
      .all();

    const articlesByLang = db
      .prepare("SELECT lang, COUNT(*) as count FROM articles GROUP BY lang ORDER BY count DESC")
      .all();

    const recentEvents = db
      .prepare(
        `SELECT id, category, importance_score, stage, llm_importance, triage_reason, review_attempts, created_at
         FROM events ORDER BY id DESC LIMIT 10`,
      )
      .all();

    const recentJobs = db
      .prepare(
        `SELECT * FROM job_runs ORDER BY id DESC LIMIT 10`,
      )
      .all();

    const publishedArticles = db
      .prepare(
        `SELECT a.id, a.event_id, a.lang, a.slug, a.published_at, e.stage
         FROM articles a JOIN events e ON a.event_id = e.id
         WHERE e.stage = 'published'
         LIMIT 10`,
      )
      .all();

    const totalArticles = db
      .prepare("SELECT COUNT(*) as n FROM articles")
      .get() as { n: number };

    const totalEvents = db
      .prepare("SELECT COUNT(*) as n FROM events")
      .get() as { n: number };

    const totalRaw = db
      .prepare("SELECT COUNT(*) as n FROM raw_articles")
      .get() as { n: number };

    return new Response(
      JSON.stringify({
        summary: {
          totalEvents: totalEvents.n,
          totalArticles: totalArticles.n,
          totalRawArticles: totalRaw.n,
        },
        eventStages: stages,
        articlesByLang,
        publishedArticles,
        recentEvents,
        recentJobs,
        uptime: `${Math.floor(process.uptime())}s`,
      }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    db.close();
  }
};
