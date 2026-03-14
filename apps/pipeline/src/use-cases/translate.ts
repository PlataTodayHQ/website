import { LANGUAGES, LANG_CODES } from "@plata-today/shared";
import type { EventEntity, TranslationResult } from "../domain/entities.js";
import type { IEventRepository } from "../ports/event-repository.js";
import type { IArticleRepository } from "../ports/article-repository.js";
import type { ILLMService } from "../ports/llm-service.js";
import { log } from "../logger.js";

const BATCH_SIZE = 3;

export async function translateEvent(
  eventRepo: IEventRepository,
  articleRepo: IArticleRepository,
  llm: ILLMService,
  event: EventEntity,
): Promise<number> {
  const esArticle = articleRepo.getSpanish(event.id);
  if (!esArticle) {
    log.warn("No Spanish article for translation", { eventId: event.id });
    return 0;
  }

  const existingLangs = new Set(articleRepo.getExistingLangs(event.id));
  const langsToProcess = LANG_CODES.filter((l) => l !== "es" && !existingLangs.has(l));

  if (langsToProcess.length === 0) {
    eventRepo.setStage(event.id, "published");
    log.info("All translations exist, publishing", { eventId: event.id });
    return 0;
  }

  const article = {
    title: esArticle.title,
    body: esArticle.body,
    meta_description: esArticle.meta_description,
  };

  let articlesCreated = 0;

  for (let i = 0; i < langsToProcess.length; i += BATCH_SIZE) {
    const batchLangs = langsToProcess.slice(i, i + BATCH_SIZE);
    const langInfos = batchLangs.map((code) => ({
      code,
      name: LANGUAGES[code].name,
    }));

    try {
      let results: TranslationResult[];

      if (batchLangs.length === 1) {
        const result = await llm.translate(article, batchLangs[0], event.category);
        results = [result];
      } else {
        results = await llm.translateBatch(article, langInfos, event.category);
      }

      for (const result of results) {
        const lang = result.lang ?? batchLangs[0];
        if (!(batchLangs as string[]).includes(lang)) {
          log.warn("LLM returned unexpected lang", { eventId: event.id, lang });
          continue;
        }

        const wordCount = result.body.split(/\s+/).filter(Boolean).length;
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
        log.info("Translation created", { eventId: event.id, lang, slug: result.slug });
      }

      // Retry missing languages individually
      const returnedLangs = new Set(results.map((r) => r.lang));
      const missingLangs = batchLangs.filter((l) => !returnedLangs.has(l));

      for (const lang of missingLangs) {
        try {
          const result = await llm.translate(article, lang, event.category);
          const wordCount = result.body.split(/\s+/).filter(Boolean).length;
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
          log.info("Translation created (fallback)", { eventId: event.id, lang });
        } catch (err) {
          log.error("Fallback translation failed", { eventId: event.id, lang, error: String(err) });
        }
      }
    } catch (err) {
      log.error("Batch translation failed", { eventId: event.id, langs: batchLangs, error: String(err) });

      // Retry each language individually
      for (const lang of batchLangs) {
        try {
          const result = await llm.translate(article, lang, event.category);
          const wordCount = result.body.split(/\s+/).filter(Boolean).length;
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
          log.info("Translation created (individual fallback)", { eventId: event.id, lang });
        } catch (innerErr) {
          log.error("Individual translation failed", { eventId: event.id, lang, error: String(innerErr) });
        }
      }
    }
  }

  if (articlesCreated > 0) {
    eventRepo.setStage(event.id, "published");
    log.info("Event published", { eventId: event.id, translations: articlesCreated });
  }

  return articlesCreated;
}
