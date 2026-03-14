import type { APIRoute } from "astro";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const prerender = false;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DATABASE_PATH ??
  path.resolve(__dirname, "../../../../../../data/plata.db");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  let body: { email?: string; lang?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const lang = (body.lang ?? "en").trim().slice(0, 5);

  if (!email || !EMAIL_RE.test(email)) {
    return json({ error: "Invalid email" }, 400);
  }

  if (!fs.existsSync(DB_PATH)) {
    return json({ error: "Service unavailable" }, 503);
  }

  try {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");

    // Ensure table exists (idempotent)
    db.exec(`CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      lang TEXT NOT NULL DEFAULT 'en',
      subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
      unsubscribed_at TEXT
    )`);

    // Upsert: insert or re-subscribe if previously unsubscribed
    db.prepare(
      `INSERT INTO subscribers (email, lang)
       VALUES (?, ?)
       ON CONFLICT(email) DO UPDATE SET
         lang = excluded.lang,
         unsubscribed_at = NULL`,
    ).run(email, lang);

    db.close();
    return json({ ok: true });
  } catch {
    return json({ error: "Server error" }, 500);
  }
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
