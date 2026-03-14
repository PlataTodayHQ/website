import type { RawArticleEntity, NewRawArticle, SourceEntity } from "../domain/entities.js";

export interface IRawArticleRepository {
  getUnprocessed(): RawArticleEntity[];
  getRecentClustered(): RawArticleEntity[];
  setClusterId(articleId: number, clusterId: number): void;
  insert(article: NewRawArticle): boolean;
  getNeedingFullText(): Array<{ id: number; original_url: string }>;
  updateBody(id: number, body: string): void;
  getAllSources(): SourceEntity[];
  runInTransaction(fn: () => void): void;
}
