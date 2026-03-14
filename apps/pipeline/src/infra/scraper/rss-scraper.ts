import type { ScrapedItem } from "../../domain/entities.js";
import type { IScraper } from "../../ports/scraper.js";
import { scrapeAllFeeds } from "../../scraper/index.js";

export class RSSScraper implements IScraper {
  async scrapeAll(): Promise<ScrapedItem[]> {
    return await scrapeAllFeeds() as ScrapedItem[];
  }
}
