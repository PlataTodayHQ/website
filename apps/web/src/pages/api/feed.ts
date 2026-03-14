import type { APIRoute } from "astro";
import { LANGUAGES } from "@plata-today/shared";
import { getArticlesFeed, timeAgo, readingTime } from "@/lib/db";

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const lang = url.searchParams.get("lang") || "en";
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
  const category = url.searchParams.get("category") || undefined;

  if (!(lang in LANGUAGES)) {
    return new Response(JSON.stringify({ error: "Invalid language" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { articles, hasMore } = getArticlesFeed(lang, offset, limit, category);

  const mapped = articles.map((a) => ({
    title: a.title,
    slug: a.slug,
    href: `/${lang}/news/${a.slug}`,
    description: a.meta_description ?? "",
    imageUrl: a.image_url ?? "",
    category: a.category,
    timeAgo: timeAgo(a.published_at, lang),
    readingTime: readingTime(a.word_count, lang),
    publishedAt: a.published_at,
  }));

  return new Response(JSON.stringify({ articles: mapped, hasMore }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
    },
  });
};
