import type Database from "better-sqlite3";
import type { Queries } from "../db/queries.js";
import { isClusterMatch } from "../dedup/similarity.js";
import { log } from "../logger.js";

interface RawArticleRow {
  id: number;
  title: string;
  body: string;
  category: string | null;
  published_at: string | null;
  cluster_id: number | null;
}

export function clusterArticles(
  db: Database.Database,
  queries: Queries,
): { newClusters: number; clusteredArticles: number } {
  const unprocessed = queries.getUnprocessedRawArticles.all() as RawArticleRow[];
  if (unprocessed.length === 0) return { newClusters: 0, clusteredArticles: 0 };

  // Load recently clustered articles to match against
  const recentClustered =
    queries.getRecentClusteredArticles.all() as RawArticleRow[];

  let newClusters = 0;
  let clusteredArticles = 0;

  // O(1) lookup for batch articles by id
  const articleById = new Map(unprocessed.map((a) => [a.id, a]));

  // Track cluster assignments within this batch
  const batchAssignments = new Map<number, number>(); // articleId -> clusterId

  const doCluster = db.transaction(() => {
    for (const article of unprocessed) {
      let assignedClusterId: number | null = null;

      // 1. Check against recently clustered articles from DB
      for (const existing of recentClustered) {
        if (
          existing.cluster_id &&
          isClusterMatch(article, existing)
        ) {
          assignedClusterId = existing.cluster_id;
          break;
        }
      }

      // 2. Check against articles already assigned in this batch
      if (!assignedClusterId) {
        for (const [otherId, otherClusterId] of batchAssignments) {
          const other = articleById.get(otherId);
          if (other && isClusterMatch(article, other)) {
            assignedClusterId = otherClusterId;
            break;
          }
        }
      }

      // 3. Create a new cluster (event)
      if (!assignedClusterId) {
        const category = article.category ?? "society";
        const result = queries.insertEvent.run(category, 0);
        assignedClusterId = Number(result.lastInsertRowid);
        newClusters++;
      }

      queries.setClusterId.run(assignedClusterId, article.id);
      batchAssignments.set(article.id, assignedClusterId);
      clusteredArticles++;
    }
  });

  doCluster();

  log.info("Clustering complete", { newClusters, clusteredArticles });
  return { newClusters, clusteredArticles };
}
