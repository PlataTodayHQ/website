import type { ArticleEntity, NewArticle } from "../domain/entities.js";

export interface IArticleRepository {
  insert(article: NewArticle): void;
  getSpanish(eventId: number): ArticleEntity | null;
  update(id: number, title: string, body: string, meta: string): void;
  getExistingLangs(eventId: number): string[];
}
