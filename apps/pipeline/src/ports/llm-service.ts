import type {
  SourceText, TriageResult, DraftResult,
  ReviewResult, RewriteResult, ValidateRewriteResult,
} from "../domain/entities.js";

export interface DraftInput {
  title: string;
  body: string;
  meta_description: string;
}

export interface ILLMService {
  triage(sources: SourceText[]): Promise<TriageResult>;
  draft(sources: SourceText[], category: string, date: string): Promise<DraftResult>;
  review(draft: DraftInput, sources: SourceText[]): Promise<ReviewResult>;
  rewrite(article: DraftInput, lang: string, category: string): Promise<RewriteResult>;
  validateRewrite(original: DraftInput, rewrite: DraftInput, lang: string): Promise<ValidateRewriteResult>;
}
