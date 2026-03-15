import { LANG_CODES } from "@plata-today/shared";
import type { EventEntity } from "../domain/entities.js";
import type { IEventRepository } from "../ports/event-repository.js";
import type { IArticleRepository } from "../ports/article-repository.js";
import type { ILLMService } from "../ports/llm-service.js";
import { log } from "../logger.js";
import { runConcurrent } from "../concurrency.js";

const MIN_WORD_COUNT = 30;

export async function rewriteEvent(
  eventRepo: IEventRepository,
  articleRepo: IArticleRepository,
  llm: ILLMService,
  event: EventEntity,
  concurrency = 5,
): Promise<number> {
  const esArticle = articleRepo.getSpanish(event.id);
  if (!esArticle) {
    log.warn("No Spanish article for rewrite", { eventId: event.id });
    return 0;
  }

  const existingLangs = new Set(articleRepo.getExistingLangs(event.id));
  const langsToProcess = LANG_CODES.filter((l) => l !== "es" && !existingLangs.has(l));

  if (langsToProcess.length === 0) {
    eventRepo.setStage(event.id, "published");
    log.info("All rewrites exist, publishing", { eventId: event.id });
    return 0;
  }

  const article = {
    title: esArticle.title,
    body: esArticle.body,
    meta_description: esArticle.meta_description,
  };

  let articlesCreated = 0;

  const processLang = async (lang: string): Promise<void> => {
    try {
      const result = await llm.rewrite(article, lang, event.category);

      const wordCount = result.body.split(/\s+/).filter(Boolean).length;
      if (wordCount < MIN_WORD_COUNT) {
        log.warn("Rewrite too short, skipping", { eventId: event.id, lang, wordCount });
        return;
      }

      articleRepo.insert({
        eventId: event.id,
        lang,
        slug: result.slug,
        title: result.title,
        body: result.body,
        metaDescription: result.meta_description,
        imageUrl: esArticle.image_url,
        imageSource: esArticle.image_source,
        sourceNames: esArticle.source_names,
        sourceUrls: esArticle.source_urls,
        wordCount,
      });
      articlesCreated++;
      log.info("Rewrite created", { eventId: event.id, lang, slug: result.slug });
    } catch (err) {
      log.error("Rewrite failed", { eventId: event.id, lang, error: String(err) });
    }
  };

  await runConcurrent(langsToProcess, processLang, concurrency);

  // Check actual completeness from DB
  const finalLangs = new Set(articleRepo.getExistingLangs(event.id));
  const allComplete = LANG_CODES.every((l) => finalLangs.has(l));

  if (allComplete) {
    eventRepo.setStage(event.id, "published");
    log.info("Event published", { eventId: event.id, rewrites: articlesCreated });
  } else {
    const missing = LANG_CODES.filter((l) => !finalLangs.has(l));
    log.warn("Incomplete rewrites, will retry next run", {
      eventId: event.id, created: articlesCreated, missing,
    });
  }

  return articlesCreated;
}
