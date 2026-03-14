import type {
  SourceText, TriageResult, DraftResult,
  ReviewResult, TranslationResult,
} from "../domain/entities.js";

export interface DraftInput {
  title: string;
  body: string;
  meta_description: string;
}

export interface LangInfo {
  code: string;
  name: string;
}

export interface ILLMService {
  triage(sources: SourceText[]): Promise<TriageResult>;
  draft(sources: SourceText[], category: string, date: string): Promise<DraftResult>;
  review(draft: DraftInput, sources: SourceText[]): Promise<ReviewResult>;
  translate(article: DraftInput, lang: string, category: string): Promise<TranslationResult>;
  translateBatch(article: DraftInput, langs: LangInfo[], category: string): Promise<TranslationResult[]>;
}
