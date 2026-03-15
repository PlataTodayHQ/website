/**
 * Pure event scoring. Zero external dependencies.
 * sourceTiers is passed as argument — no import of source config.
 */

interface ScoringArticle {
  source_id: number;
  source_name: string;
  category: string | null;
  published_at: string | null;
}

const TIER_WEIGHTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 };

export function scoreEvent(
  rawArticles: ScoringArticle[],
  sourceTiers: Map<string, number>,
): number {
  const uniqueSourceTiers = new Map<number, number>();
  for (const a of rawArticles) {
    if (!uniqueSourceTiers.has(a.source_id)) {
      uniqueSourceTiers.set(a.source_id, sourceTiers.get(a.source_name) ?? 3);
    }
  }

  const sourceCount = uniqueSourceTiers.size;
  const tierScore = [...uniqueSourceTiers.values()].reduce(
    (sum, tier) => sum + (TIER_WEIGHTS[tier] ?? 1), 0,
  );

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const recencyBonus = rawArticles.some((a) => {
    if (!a.published_at) return false;
    return new Date(a.published_at).getTime() > twoHoursAgo;
  }) ? 1.0 : 0;

  return sourceCount * 1.0 + tierScore * 0.5 + recencyBonus;
}

export function getPluralityCategory(rawArticles: ScoringArticle[]): string {
  const counts = new Map<string, number>();
  for (const a of rawArticles) {
    if (!a.category) continue; // Skip articles without a category — don't bias toward any default
    counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
  }
  // If no article had a category, fall back to "society" as a neutral default
  if (counts.size === 0) return "society";
  let best = "society";
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount) { best = cat; bestCount = count; }
  }
  return best;
}
