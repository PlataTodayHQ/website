import type { IRawArticleRepository } from "../ports/raw-article-repository.js";
import type { IEventRepository } from "../ports/event-repository.js";
import { isClusterMatch } from "../domain/similarity.js";
import { scoreEvent, getPluralityCategory } from "../domain/scoring.js";
import { log } from "../logger.js";

export function clusterAndScore(
  rawArticleRepo: IRawArticleRepository,
  eventRepo: IEventRepository,
  sourceTiers: Map<string, number>,
): { newClusters: number; clustered: number } {
  // Phase 1: Cluster unprocessed articles
  const { newClusters, clustered } = clusterArticles(rawArticleRepo, eventRepo);

  // Phase 2: Score all unpublished events
  scoreEvents(eventRepo, sourceTiers);

  return { newClusters, clustered };
}

function clusterArticles(
  rawArticleRepo: IRawArticleRepository,
  eventRepo: IEventRepository,
): { newClusters: number; clustered: number } {
  const unprocessed = rawArticleRepo.getUnprocessed();
  if (unprocessed.length === 0) return { newClusters: 0, clustered: 0 };

  const recentClustered = rawArticleRepo.getRecentClustered();

  let newClusters = 0;
  let clustered = 0;

  const articleById = new Map(unprocessed.map((a) => [a.id, a]));
  const batchAssignments = new Map<number, number>();

  rawArticleRepo.runInTransaction(() => {
    for (const article of unprocessed) {
      let assignedClusterId: number | null = null;

      // 1. Match against recently clustered articles
      for (const existing of recentClustered) {
        if (existing.cluster_id && isClusterMatch(article, existing)) {
          assignedClusterId = existing.cluster_id;
          break;
        }
      }

      // 2. Match against articles assigned in this batch
      if (!assignedClusterId) {
        for (const [otherId, otherClusterId] of batchAssignments) {
          const other = articleById.get(otherId);
          if (other && isClusterMatch(article, other)) {
            assignedClusterId = otherClusterId;
            break;
          }
        }
      }

      // 3. Create new event
      if (!assignedClusterId) {
        const category = article.category ?? "society";
        assignedClusterId = eventRepo.create(category, 0);
        newClusters++;
      }

      rawArticleRepo.setClusterId(article.id, assignedClusterId);
      batchAssignments.set(article.id, assignedClusterId);
      clustered++;
    }
  });

  log.info("Clustering complete", { newClusters, clustered });
  return { newClusters, clustered };
}

function scoreEvents(
  eventRepo: IEventRepository,
  sourceTiers: Map<string, number>,
): void {
  const unpublished = eventRepo.getAllUnpublished();

  for (const event of unpublished) {
    const articles = eventRepo.getRawArticles(event.id);
    if (articles.length === 0) continue;

    const score = scoreEvent(articles, sourceTiers);
    eventRepo.updateScore(event.id, score);

    const category = getPluralityCategory(articles);
    eventRepo.updateCategory(event.id, category);
  }

  log.info("Scoring complete", { events: unpublished.length });
}
