import type { IFullTextExtractor } from "../../ports/scraper.js";
import { extractFullText } from "../../scraper/extract.js";

export class ReadabilityExtractor implements IFullTextExtractor {
  async extract(url: string): Promise<{ content: string } | null> {
    const result = await extractFullText(url);
    if (!result) return null;
    return { content: result.content };
  }
}
