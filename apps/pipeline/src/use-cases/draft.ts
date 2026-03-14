import type { EventEntity } from "../domain/entities.js";
import type { IEventRepository } from "../ports/event-repository.js";
import type { IArticleRepository } from "../ports/article-repository.js";
import type { ILLMService } from "../ports/llm-service.js";
import { log } from "../logger.js";

export async function draftEvent(
  eventRepo: IEventRepository,
  articleRepo: IArticleRepository,
  llm: ILLMService,
  event: EventEntity,
): Promise<boolean> {
  const rawArticles = eventRepo.getRawArticles(event.id);
  if (rawArticles.length === 0) return false;

  const sources = rawArticles.map((a) => ({
    name: a.source_name,
    text: `${a.title}\n\n${a.body}`,
  }));

  const eventDate = rawArticles[0].published_at ?? new Date().toISOString().split("T")[0];
  const draft = await llm.draft(sources, event.category, eventDate);

  if (!draft.title || !draft.body) {
    log.warn("Draft has empty title or body", { eventId: event.id });
    return false;
  }

  const wordCount = draft.body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 100) {
    log.warn("Draft too short, skipping", { eventId: event.id, wordCount });
    return false;
  }

  const imageArticle = rawArticles.find((a) => a.image_url);
  const sourceNames = JSON.stringify([...new Set(rawArticles.map((a) => a.source_name))]);
  const sourceUrls = JSON.stringify([...new Set(rawArticles.map((a) => a.original_url))]);

  articleRepo.insert({
    eventId: event.id,
    lang: "es",
    slug: draft.slug,
    title: draft.title,
    body: draft.body,
    metaDescription: draft.meta_description,
    imageUrl: imageArticle?.image_url ?? null,
    imageSource: imageArticle?.image_source ?? null,
    sourceNames,
    sourceUrls,
    wordCount,
  });

  eventRepo.setStage(event.id, "drafted");
  log.info("Event drafted", { eventId: event.id, slug: draft.slug, words: wordCount });
  return true;
}
