export interface EventEntity {
  id: number;
  category: string;
  importance_score: number;
  stage: string;
  llm_importance: number | null;
  llm_category: string | null;
  triage_reason: string | null;
  review_attempts: number;
  review_feedback: string | null;
  subcategory: string | null;
  created_at: string;
}

export interface RawArticleEntity {
  id: number;
  source_id: number;
  original_url: string;
  title: string;
  body: string;
  category: string | null;
  image_url: string | null;
  image_source: string | null;
  published_at: string | null;
  cluster_id: number | null;
  is_processed: number;
  source_name: string;
  source_url: string;
}

export interface ArticleEntity {
  id: number;
  event_id: number;
  lang: string;
  slug: string;
  title: string;
  body: string;
  meta_description: string;
  image_url: string | null;
  image_source: string | null;
  source_names: string;
  source_urls: string;
  word_count: number;
}

export interface SourceEntity {
  id: number;
  name: string;
  url: string;
  is_active: number;
}

export interface SourceText {
  name: string;
  text: string;
}

export interface ScrapedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  imageUrl: string | null;
  sourceName: string;
  sourceUrl: string;
  sourceTier: 1 | 2 | 3;
  category: string | null;
}

export interface NewRawArticle {
  sourceId: number;
  url: string;
  title: string;
  body: string;
  category: string | null;
  imageUrl: string | null;
  imageSource: string | null;
  publishedAt: string | null;
}

export interface NewArticle {
  eventId: number;
  lang: string;
  slug: string;
  title: string;
  body: string;
  metaDescription: string;
  imageUrl: string | null;
  imageSource: string | null;
  sourceNames: string;
  sourceUrls: string;
  wordCount: number;
}

export interface TriageResult {
  argentina_relevant: boolean;
  importance: number;
  category: string;
  secondary_categories?: string[];
  subcategory?: string;
  reasoning: string;
}

export interface DraftResult {
  title: string;
  slug: string;
  meta_description: string;
  body: string;
}

export interface ReviewResult {
  approved: boolean;
  feedback: string;
  checks?: {
    hallucination: string;
    tone: string;
    completeness: string;
    style: string;
    seo: string;
  };
  corrected_title: string;
  corrected_body: string;
  corrected_meta_description: string;
}

export interface RewriteResult {
  lang?: string;
  title: string;
  slug: string;
  meta_description: string;
  body: string;
}

export interface ValidateRewriteResult {
  valid: boolean;
  issues: string[];
  corrected_title?: string;
  corrected_body?: string;
  corrected_meta_description?: string;
}
