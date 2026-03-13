import type { LangCode } from "./languages.js";
import type { Category } from "./categories.js";

export interface Source {
  id: number;
  name: string;
  url: string;
  rssUrl: string | null;
  scrapeMethod: "rss" | "sitemap" | "html";
  scrapeIntervalMin: number;
  isActive: boolean;
}

export interface RawArticle {
  id: number;
  sourceId: number;
  originalUrl: string;
  title: string;
  body: string;
  category: Category | null;
  imageUrl: string | null;
  publishedAt: string | null;
  scrapedAt: string;
  clusterId: number | null;
  isProcessed: boolean;
}

export interface Event {
  id: number;
  category: Category;
  importanceScore: number;
  createdAt: string;
  isPublished: boolean;
}

export interface Article {
  id: number;
  eventId: number;
  lang: LangCode;
  slug: string;
  title: string;
  body: string;
  metaDescription: string | null;
  imageUrl: string | null;
  sourceNames: string[];
  sourceUrls: string[];
  wordCount: number;
  publishedAt: string;
}
