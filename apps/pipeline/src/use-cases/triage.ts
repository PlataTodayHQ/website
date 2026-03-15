import { CATEGORY_LIST } from "@plata-today/shared";
import type { EventEntity } from "../domain/entities.js";
import type { IEventRepository } from "../ports/event-repository.js";
import type { ILLMService } from "../ports/llm-service.js";
import { log } from "../logger.js";

export async function triageEvent(
  eventRepo: IEventRepository,
  llm: ILLMService,
  event: EventEntity,
): Promise<"triaged" | "killed"> {
  const rawArticles = eventRepo.getRawArticles(event.id);
  if (rawArticles.length === 0) {
    eventRepo.kill(event.id, 0, "No source articles");
    return "killed";
  }

  const totalBodyLen = rawArticles.reduce((sum, a) => sum + a.body.length, 0);
  if (totalBodyLen < 200) {
    eventRepo.kill(event.id, 1, "Source text too short");
    log.info("Event killed — source text too short", { eventId: event.id, totalBodyLen });
    return "killed";
  }

  const sources = rawArticles.map((a) => ({
    name: a.source_name,
    text: `${a.title}\n\n${a.body}`,
  }));

  const result = await llm.triage(sources);

  const argentinaRelevant = result.argentina_relevant !== false;
  const importance = Math.max(1, Math.min(100, Math.round(result.importance)));
  const category = CATEGORY_LIST.includes(result.category as any)
    ? result.category
    : event.category;
  const reasoning = String(result.reasoning ?? "").slice(0, 500);

  if (!argentinaRelevant) {
    eventRepo.kill(event.id, importance, `[NOT ARGENTINA] ${reasoning}`);
    log.info("Event killed — not about Argentina", { eventId: event.id, importance, category, reasoning });
    return "killed";
  }

  // Economy & politics get a lower kill threshold — these categories
  // often produce "routine" news (BCRA rates, exchange rates, provincial
  // policy) that scores 20-30 but is essential for international readers.
  const killThreshold = (category === "economy" || category === "politics") ? 20 : 30;

  if (importance < killThreshold) {
    eventRepo.kill(event.id, importance, reasoning);
    log.info("Event killed by triage", { eventId: event.id, importance, category, reasoning, killThreshold });
    return "killed";
  }

  eventRepo.triage(event.id, importance, category, reasoning);
  log.info("Event triaged", { eventId: event.id, importance, category, reasoning });
  return "triaged";
}
