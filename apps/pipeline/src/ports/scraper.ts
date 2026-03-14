import type { ScrapedItem } from "../domain/entities.js";

export interface IScraper {
  scrapeAll(): Promise<ScrapedItem[]>;
}

export interface IFullTextExtractor {
  extract(url: string): Promise<{ content: string } | null>;
}
