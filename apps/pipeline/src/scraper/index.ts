import { fetchRSS, type RSSItem } from "./rss.js";
import { SOURCES, type SourceConfig } from "./sources.js";
import { log } from "@plata-today/shared";

const MAX_CONCURRENT_TOTAL = 10;
const MAX_CONCURRENT_PER_DOMAIN = 2;
const SKIP_TITLE_PATTERN = /\b(en vivo|en directo|minuto a minuto|segu[íi] el|EN VIVO)\b/i;

export interface ScrapedItem extends RSSItem {
  sourceName: string;
  sourceUrl: string;
  sourceTier: 1 | 2 | 3;
  category: string | null;
}

export async function scrapeAllFeeds(
  sources: SourceConfig[] = SOURCES,
): Promise<ScrapedItem[]> {
  // Group feeds by domain for per-domain rate limiting
  const feedsByDomain = new Map<string, Array<{ source: SourceConfig; feed: { rssUrl: string; category?: string } }>>();

  for (const source of sources) {
    for (const feed of source.feeds) {
      let domain: string;
      try {
        domain = new URL(feed.rssUrl).hostname;
      } catch {
        domain = "unknown";
      }
      if (!feedsByDomain.has(domain)) feedsByDomain.set(domain, []);
      feedsByDomain.get(domain)!.push({ source, feed });
    }
  }

  const items: ScrapedItem[] = [];
  let totalFeeds = 0;

  // Process domains with global concurrency limit
  const domainEntries = [...feedsByDomain.entries()];
  const domainResults = await runWithConcurrency(
    domainEntries,
    MAX_CONCURRENT_TOTAL,
    async ([_domain, feeds]) => {
      // Within each domain, respect per-domain concurrency
      const domainItems = await runWithConcurrency(
        feeds,
        MAX_CONCURRENT_PER_DOMAIN,
        async ({ source, feed }) => {
          totalFeeds++;
          try {
            const rssItems = await fetchRSS(feed.rssUrl);
            return rssItems.map((item) => ({
              ...item,
              sourceName: source.name,
              sourceUrl: source.url,
              sourceTier: source.tier,
              category: feed.category ?? null,
            }));
          } catch (err) {
            log.warn("Feed fetch failed", {
              source: source.name,
              url: feed.rssUrl,
              error: String(err),
            });
            return [] as ScrapedItem[];
          }
        },
      );

      return domainItems.flat();
    },
  );

  for (const domainItems of domainResults) {
    items.push(...domainItems);
  }

  // Filter live blogs and play-by-play content
  const beforeFilter = items.length;
  const filtered = items.filter((item) => !SKIP_TITLE_PATTERN.test(item.title));
  const skipped = beforeFilter - filtered.length;

  log.info("Scraping summary", {
    domains: domainEntries.length,
    totalFeeds,
    totalItems: beforeFilter,
    filteredLive: skipped,
    afterFilter: filtered.length,
  });

  return filtered;
}

/** Simple concurrency limiter — runs tasks with at most `limit` in parallel */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}
