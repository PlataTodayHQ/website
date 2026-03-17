import type { IRawArticleRepository } from "../ports/raw-article-repository.js";
import type { IEventRepository } from "../ports/event-repository.js";
import { isClusterMatch, buildIdfIndex, type IdfIndex } from "../domain/similarity.js";
import { scoreEvent, getPluralityCategory } from "../domain/scoring.js";
import { log } from "@plata-today/shared";

export function clusterAndScore(
  rawArticleRepo: IRawArticleRepository,
  eventRepo: IEventRepository,
  sourceTiers: Map<string, number>,
): { newClusters: number; clustered: number } {
  // Phase 1: Build IDF index from recent articles for better clustering
  const recentArticles = rawArticleRepo.getRecentClustered();
  const unprocessed = rawArticleRepo.getUnprocessed();
  const allTexts = [
    ...recentArticles.map((a) => `${a.title} ${a.body}`),
    ...unprocessed.map((a) => `${a.title} ${a.body}`),
  ];
  const idf = buildIdfIndex(allTexts);

  // Phase 2: Cluster unprocessed articles
  const { newClusters, clustered } = clusterArticles(rawArticleRepo, eventRepo, recentArticles, unprocessed, idf);

  // Phase 3: Score all unpublished events
  scoreEvents(eventRepo, sourceTiers);

  return { newClusters, clustered };
}

function clusterArticles(
  rawArticleRepo: IRawArticleRepository,
  eventRepo: IEventRepository,
  recentClustered: ReturnType<IRawArticleRepository["getRecentClustered"]>,
  unprocessed: ReturnType<IRawArticleRepository["getUnprocessed"]>,
  idf: IdfIndex,
): { newClusters: number; clustered: number } {
  if (unprocessed.length === 0) return { newClusters: 0, clustered: 0 };

  let newClusters = 0;
  let clustered = 0;

  const articleById = new Map(unprocessed.map((a) => [a.id, a]));
  const batchAssignments = new Map<number, number>();

  rawArticleRepo.runInTransaction(() => {
    for (const article of unprocessed) {
      let assignedClusterId: number | null = null;

      // 1. Match against recently clustered articles
      for (const existing of recentClustered) {
        if (existing.cluster_id && isClusterMatch(article, existing, 0.55, idf)) {
          // If the existing cluster's event is already published, create a new event
          // linked via parent_event_id (developing story)
          const existingStage = eventRepo.getEventStageByClusterId(existing.cluster_id);
          if (existingStage === "published") {
            const category = article.category ?? "economy";
            assignedClusterId = eventRepo.createWithParent(category, 0, existing.cluster_id);
            newClusters++;
            log.info("Developing story — new event for published cluster", {
              parentEventId: existing.cluster_id,
              newEventId: assignedClusterId,
            });
          } else {
            assignedClusterId = existing.cluster_id;
          }
          break;
        }
      }

      // 2. Match against articles assigned in this batch
      if (!assignedClusterId) {
        for (const [otherId, otherClusterId] of batchAssignments) {
          const other = articleById.get(otherId);
          if (other && isClusterMatch(article, other, 0.55, idf)) {
            assignedClusterId = otherClusterId;
            break;
          }
        }
      }

      // 3. Create new event
      if (!assignedClusterId) {
        const category = article.category ?? "economy";
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
