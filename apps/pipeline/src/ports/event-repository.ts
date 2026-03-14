import type { EventEntity, RawArticleEntity } from "../domain/entities.js";

export interface IEventRepository {
  getByStage(stage: string, limit: number): EventEntity[];
  getAllUnpublished(): EventEntity[];
  create(category: string, score: number): number;
  getRawArticles(eventId: number): RawArticleEntity[];
  updateScore(id: number, score: number): void;
  updateCategory(id: number, category: string): void;
  setStage(id: number, stage: string): void;
  triage(id: number, importance: number, category: string, reason: string): void;
  kill(id: number, importance: number, reason: string): void;
  incrementReviewAttempts(id: number): void;
}
