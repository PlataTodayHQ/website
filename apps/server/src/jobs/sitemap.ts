import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { LANG_CODES, CATEGORY_LIST } from "@plata-today/shared";
import { recordJobStart, recordJobEnd } from "./job-tracking.js";

const SITE = "https://plata.today";

/** Static pages with their changefreq and priority */
const STATIC_PAGES: Array<{ path: string; changefreq: string; priority: number }> = [
  { path: "",                    changefreq: "hourly",  priority: 1.0 },
  { path: "/about",             changefreq: "monthly", priority: 0.4 },
  { path: "/mission",           changefreq: "monthly", priority: 0.4 },
  { path: "/newsroom",          changefreq: "monthly", priority: 0.4 },
  { path: "/standards",         changefreq: "monthly", priority: 0.5 },
  { path: "/corrections",       changefreq: "weekly",  priority: 0.4 },
  { path: "/contact",           changefreq: "monthly", priority: 0.3 },
  { path: "/founder",           changefreq: "monthly", priority: 0.3 },
  { path: "/feed",              changefreq: "hourly",  priority: 0.6 },
  { path: "/privacy",           changefreq: "monthly", priority: 0.2 },
  { path: "/terms",             changefreq: "monthly", priority: 0.2 },
  { path: "/markets",           changefreq: "hourly",  priority: 0.7 },
  { path: "/markets/stock",     changefreq: "hourly",  priority: 0.6 },
  { path: "/markets/currencies",changefreq: "hourly",  priority: 0.6 },
  { path: "/markets/merval",    changefreq: "hourly",  priority: 0.6 },
  { path: "/markets/screener",  changefreq: "daily",   priority: 0.5 },
];

interface ArticleInfo {
  slug: string;
  published_at: string;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildUrlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: number): string {
  let entry = `  <url>\n    <loc>${escapeXml(loc)}</loc>`;
  if (lastmod) entry += `\n    <lastmod>${lastmod}</lastmod>`;
  if (changefreq) entry += `\n    <changefreq>${changefreq}</changefreq>`;
  if (priority !== undefined) entry += `\n    <priority>${priority.toFixed(1)}</priority>`;
  entry += "\n  </url>";
  return entry;
}

function buildLangSitemap(lang: string, articles: ArticleInfo[]): string {
  const entries: string[] = [];

  // Static pages
  for (const page of STATIC_PAGES) {
    entries.push(buildUrlEntry(`${SITE}/${lang}${page.path}`, undefined, page.changefreq, page.priority));
  }

  // Category pages
  for (const cat of CATEGORY_LIST) {
    entries.push(buildUrlEntry(`${SITE}/${lang}/category/${cat}`, undefined, "hourly", 0.7));
  }

  // Article pages
  for (const a of articles) {
    const date = a.published_at.slice(0, 10);
    entries.push(buildUrlEntry(`${SITE}/${lang}/news/${a.slug}`, date, "weekly", 0.8));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;
}

function buildSitemapIndex(langs: string[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const entries = langs.map(
    (lang) =>
      `  <sitemap>\n    <loc>${SITE}/sitemap-${lang}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</sitemapindex>`;
}

export async function generateSitemaps(db: Database.Database, distDir: string): Promise<void> {
  const runId = recordJobStart(db, "sitemap");

  try {
    const rows = db
      .prepare(
        `SELECT a.lang, a.slug, a.published_at
         FROM articles a JOIN events e ON a.event_id = e.id
         WHERE e.stage = 'published'
         ORDER BY a.published_at DESC`,
      )
      .all() as Array<{ lang: string; slug: string; published_at: string }>;

    // Group by language
    const byLang = new Map<string, ArticleInfo[]>();
    for (const row of rows) {
      let list = byLang.get(row.lang);
      if (!list) {
        list = [];
        byLang.set(row.lang, list);
      }
      list.push({ slug: row.slug, published_at: row.published_at });
    }

    // Generate per-language sitemaps
    for (const lang of LANG_CODES) {
      const articles = byLang.get(lang) ?? [];
      const xml = buildLangSitemap(lang, articles);
      fs.writeFileSync(path.join(distDir, `sitemap-${lang}.xml`), xml, "utf-8");
    }

    // Generate index
    const indexXml = buildSitemapIndex([...LANG_CODES]);
    fs.writeFileSync(path.join(distDir, "sitemap-index.xml"), indexXml, "utf-8");

    console.log("[sitemap] Generated sitemaps for %d languages, %d articles total", LANG_CODES.length, rows.length);
    recordJobEnd(db, runId, "success");
  } catch (err) {
    recordJobEnd(db, runId, "error", String(err));
    throw err;
  }
}
