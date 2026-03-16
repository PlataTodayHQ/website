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
  title: string;
  published_at: string;
  event_id?: number;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface HreflangLink {
  lang: string;
  href: string;
}

function buildUrlEntry(loc: string, lastmod?: string, changefreq?: string, priority?: number, hreflangs?: HreflangLink[]): string {
  let entry = `  <url>\n    <loc>${escapeXml(loc)}</loc>`;
  if (lastmod) entry += `\n    <lastmod>${lastmod}</lastmod>`;
  if (changefreq) entry += `\n    <changefreq>${changefreq}</changefreq>`;
  if (priority !== undefined) entry += `\n    <priority>${priority.toFixed(1)}</priority>`;
  if (hreflangs) {
    for (const hl of hreflangs) {
      entry += `\n    <xhtml:link rel="alternate" hreflang="${hl.lang}" href="${escapeXml(hl.href)}" />`;
    }
    entry += `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(hreflangs.find(h => h.lang === 'en')?.href ?? loc)}" />`;
  }
  entry += "\n  </url>";
  return entry;
}

function buildLangSitemap(
  lang: string,
  articles: ArticleInfo[],
  articleLangSlugs: Map<number, Map<string, string>>,
): string {
  const entries: string[] = [];

  // Hreflang links for static/category pages (same path in all languages)
  const staticHreflangs = (pagePath: string): HreflangLink[] =>
    LANG_CODES.map((code) => ({ lang: code, href: `${SITE}/${code}${pagePath}` }));

  // Static pages
  const today = new Date().toISOString().slice(0, 10);
  for (const page of STATIC_PAGES) {
    entries.push(buildUrlEntry(
      `${SITE}/${lang}${page.path}`, today, page.changefreq, page.priority,
      staticHreflangs(page.path),
    ));
  }

  // Category pages
  for (const cat of CATEGORY_LIST) {
    entries.push(buildUrlEntry(
      `${SITE}/${lang}/category/${cat}`, undefined, "hourly", 0.7,
      staticHreflangs(`/category/${cat}`),
    ));
  }

  // Article pages
  for (const a of articles) {
    const date = a.published_at.slice(0, 10);
    const slugsByLang = a.event_id ? articleLangSlugs.get(a.event_id) : undefined;
    const hreflangs: HreflangLink[] | undefined = slugsByLang
      ? Array.from(slugsByLang.entries()).map(([code, slug]) => ({
          lang: code,
          href: `${SITE}/${code}/news/${slug}`,
        }))
      : undefined;
    entries.push(buildUrlEntry(`${SITE}/${lang}/news/${a.slug}`, date, "weekly", 0.8, hreflangs));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>`;
}

/** Google News sitemap — only articles from last 48 hours */
function buildNewsSitemap(byLang: Map<string, ArticleInfo[]>): string {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const entries: string[] = [];

  for (const lang of LANG_CODES) {
    const articles = byLang.get(lang) ?? [];
    for (const a of articles) {
      if (new Date(a.published_at).getTime() < cutoff) continue;
      entries.push(`  <url>
    <loc>${escapeXml(`${SITE}/${lang}/news/${a.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>Plata</news:name>
        <news:language>${lang}</news:language>
      </news:publication>
      <news:publication_date>${a.published_at.slice(0, 10)}</news:publication_date>
      <news:title>${escapeXml(a.title)}</news:title>
    </news:news>
  </url>`);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join("\n")}
</urlset>`;
}

function buildSitemapIndex(langs: string[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const entries = langs.map(
    (lang) =>
      `  <sitemap>\n    <loc>${SITE}/${lang}/sitemap.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`,
  );
  // Google News sitemap
  entries.push(`  <sitemap>\n    <loc>${SITE}/news-sitemap.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`);

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
        `SELECT a.lang, a.slug, a.title, a.published_at, a.event_id
         FROM articles a JOIN events e ON a.event_id = e.id
         WHERE e.stage = 'published'
         ORDER BY a.published_at DESC`,
      )
      .all() as Array<{ lang: string; slug: string; title: string; published_at: string; event_id: number }>;

    // Group by language
    const byLang = new Map<string, ArticleInfo[]>();
    // Build event_id → { lang → slug } mapping for hreflang
    const articleLangSlugs = new Map<number, Map<string, string>>();
    for (const row of rows) {
      let list = byLang.get(row.lang);
      if (!list) {
        list = [];
        byLang.set(row.lang, list);
      }
      list.push({ slug: row.slug, title: row.title, published_at: row.published_at, event_id: row.event_id });

      let slugMap = articleLangSlugs.get(row.event_id);
      if (!slugMap) {
        slugMap = new Map();
        articleLangSlugs.set(row.event_id, slugMap);
      }
      slugMap.set(row.lang, row.slug);
    }

    // Generate per-language sitemaps
    for (const lang of LANG_CODES) {
      const articles = byLang.get(lang) ?? [];
      const xml = buildLangSitemap(lang, articles, articleLangSlugs);
      const langDir = path.join(distDir, lang);
      if (!fs.existsSync(langDir)) fs.mkdirSync(langDir, { recursive: true });
      fs.writeFileSync(path.join(langDir, "sitemap.xml"), xml, "utf-8");
    }

    // Generate Google News sitemap
    const newsXml = buildNewsSitemap(byLang);
    fs.writeFileSync(path.join(distDir, "news-sitemap.xml"), newsXml, "utf-8");

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
