import type { EventEntity, RawArticleEntity } from "../domain/entities.js";

export interface IEventRepository {
  getByStage(stage: string): EventEntity[];
  getAllUnpublished(): EventEntity[];
  create(category: string, score: number): number;
  createWithParent(category: string, score: number, parentEventId: number): number;
  getRawArticles(eventId: number): RawArticleEntity[];
  updateScore(id: number, score: number): void;
  updateCategory(id: number, category: string): void;
  setStage(id: number, stage: string): void;
  triage(id: number, importance: number, category: string, reason: string, subcategory?: string): void;
  kill(id: number, importance: number, reason: string): void;
  incrementReviewAttempts(id: number): void;
  killStaleNewEvents(staleHours: number): number;
  killStaleTriagedEvents(): number;
  getBreakingTriaged(): EventEntity[];
  getById(id: number): EventEntity | null;
  markBreaking(id: number): void;
  setCategories(eventId: number, primary: string, secondary: string[]): void;
  getEventStageByClusterId(clusterId: number): string | null;
  setReviewFeedback(id: number, feedback: string): void;
  setSubcategory(id: number, subcategory: string): void;
  repairInconsistentEvents(hasSpanishArticle: (eventId: number) => boolean): number;
}
