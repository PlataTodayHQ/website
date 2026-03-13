import type Database from "better-sqlite3";
import type { Queries } from "../db/queries.js";
import { SOURCES } from "../scraper/sources.js";
import { log } from "../logger.js";

interface RawArticleWithSource {
  id: number;
  source_id: number;
  source_name: string;
  category: string | null;
  published_at: string | null;
}

// Build tier lookup from source name
const SOURCE_TIERS = new Map<string, number>();
for (const s of SOURCES) {
  SOURCE_TIERS.set(s.name, s.tier);
}

export function scoreEvent(rawArticles: RawArticleWithSource[]): number {
  // Deduplicate by source_id — count each source only once
  const uniqueSourceTiers = new Map<number, number>();
  for (const a of rawArticles) {
    if (!uniqueSourceTiers.has(a.source_id)) {
      uniqueSourceTiers.set(a.source_id, SOURCE_TIERS.get(a.source_name) ?? 3);
    }
  }

  const sourceCount = uniqueSourceTiers.size;

  // Tier-weighted score based on unique sources only
  const tierWeights: Record<number, number> = { 1: 3, 2: 2, 3: 1 };
  const tierScore = [...uniqueSourceTiers.values()].reduce(
    (sum, tier) => sum + (tierWeights[tier] ?? 1),
    0,
  );

  // Recency bonus: articles from last 2 hours
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const recencyBonus = rawArticles.some((a) => {
    if (!a.published_at) return false;
    return new Date(a.published_at).getTime() > twoHoursAgo;
  })
    ? 1.0
    : 0;

  return sourceCount * 1.0 + tierScore * 0.5 + recencyBonus;
}

export function updateEventScores(
  db: Database.Database,
  queries: Queries,
): void {
  const unpublished = queries.getAllUnpublishedEvents.all() as Array<{
    id: number;
    category: string;
  }>;

  const doScore = db.transaction(() => {
    for (const event of unpublished) {
      const articles =
        queries.getRawArticlesForEvent.all(event.id) as RawArticleWithSource[];
      if (articles.length === 0) continue;

      const score = scoreEvent(articles);
      queries.updateEventScore.run(score, event.id);

      // Update category from the majority of articles
      const categoryCounts = new Map<string, number>();
      for (const a of articles) {
        const cat = a.category ?? "society";
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
      }
      let bestCategory = "society";
      let bestCount = 0;
      for (const [cat, count] of categoryCounts) {
        if (count > bestCount) {
          bestCategory = cat;
          bestCount = count;
        }
      }
      queries.updateEventCategory.run(bestCategory, event.id);
    }
  });

  doScore();
  log.info("Scoring complete", { events: unpublished.length });
}
