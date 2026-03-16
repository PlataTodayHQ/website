import type { APIRoute } from "astro";
import { LANGUAGES } from "@plata-today/shared";
import { getArticlesByLang } from "@/lib/db";

const SITE_URL = "https://plata.today";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const prerender = false;

export const GET: APIRoute = ({ params, redirect }) => {
  const lang = params.lang!;

  if (!(lang in LANGUAGES)) {
    return redirect("/en/rss", 302);
  }

  const articles = getArticlesByLang(lang, 30);

  const lastBuildDate = articles.length > 0
    ? new Date(articles[0].published_at).toUTCString()
    : new Date().toUTCString();

  const items = articles
    .map((a) => {
      const pubDate = new Date(a.published_at).toUTCString();
      const link = `${SITE_URL}/${a.lang}/news/${a.slug}`;
      const description = a.meta_description || "";

      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(a.category)}</category>
      <dc:creator>Plata Newsroom</dc:creator>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Plata Today</title>
    <link>${SITE_URL}/${lang}/</link>
    <description>Argentina's news, natively written in 18 languages</description>
    <language>${lang}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/${lang}/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
};
