import type { EventEntity } from "../domain/entities.js";
import type { IEventRepository } from "../ports/event-repository.js";
import type { IArticleRepository } from "../ports/article-repository.js";
import type { ILLMService } from "../ports/llm-service.js";
import { log } from "@plata-today/shared";

export async function reviewEvent(
  eventRepo: IEventRepository,
  articleRepo: IArticleRepository,
  llm: ILLMService,
  event: EventEntity,
): Promise<"reviewed" | "triaged" | "killed"> {
  const esArticle = articleRepo.getSpanish(event.id);
  if (!esArticle) {
    log.warn("No Spanish article for review", { eventId: event.id });
    eventRepo.setStage(event.id, "triaged");
    return "triaged";
  }

  const rawArticles = eventRepo.getRawArticles(event.id);
  const sources = rawArticles.map((a) => ({
    name: a.source_name,
    text: `${a.title}\n\n${a.body}`,
  }));

  const draft = {
    title: esArticle.title,
    body: esArticle.body,
    meta_description: esArticle.meta_description,
  };

  const result = await llm.review(draft, sources);

  if (result.approved) {
    const title = result.corrected_title || esArticle.title;
    const body = result.corrected_body || esArticle.body;
    const meta = result.corrected_meta_description || esArticle.meta_description;

    if (title !== esArticle.title || body !== esArticle.body || meta !== esArticle.meta_description) {
      articleRepo.update(esArticle.id, title, body, meta);
      log.info("Review applied corrections", { eventId: event.id });
    }

    eventRepo.setStage(event.id, "reviewed");
    log.info("Event reviewed — approved", { eventId: event.id, feedback: result.feedback });
    return "reviewed";
  }

  // Rejected
  eventRepo.incrementReviewAttempts(event.id);
  const attempts = (event.review_attempts ?? 0) + 1;

  if (attempts >= 3) {
    eventRepo.setStage(event.id, "killed");
    log.info("Event killed — failed review 3 times", { eventId: event.id, feedback: result.feedback });
    return "killed";
  }

  eventRepo.setStage(event.id, "triaged");
  log.info("Event sent back for redraft", { eventId: event.id, attempt: attempts, feedback: result.feedback });
  return "triaged";
}
