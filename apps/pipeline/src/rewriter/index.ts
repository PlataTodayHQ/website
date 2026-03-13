import type Database from "better-sqlite3";
import { LANGUAGES, LANG_CODES } from "@plata-today/shared";
import type { PipelineConfig } from "../config.js";
import type { Queries } from "../db/queries.js";
import { buildBatchSystemPrompt, buildBatchUserPrompt, buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { callLLMWithRetry } from "./claude.js";
import { log } from "../logger.js";

const BATCH_SIZE = 3; // languages per LLM call

interface EventRow {
  id: number;
  category: string;
}

interface RawArticleRow {
  id: number;
  title: string;
  body: string;
  category: string | null;
  image_url: string | null;
  image_source: string | null;
  published_at: string | null;
  original_url: string;
  source_name: string;
}

export async function rewriteEvent(
  config: PipelineConfig,
  db: Database.Database,
  queries: Queries,
  event: EventRow,
): Promise<number> {
  const rawArticles = queries.getRawArticlesForEvent.all(
    event.id,
  ) as RawArticleRow[];
  if (rawArticles.length === 0) return 0;

  const sources = rawArticles.map((a) => ({
    name: a.source_name,
    text: `${a.title}\n\n${a.body}`,
  }));

  const imageArticle = rawArticles.find((a) => a.image_url);
  const imageUrl = imageArticle?.image_url ?? null;
  const imageSource = imageArticle?.image_source ?? null;
  const sourceNames = JSON.stringify([
    ...new Set(rawArticles.map((a) => a.source_name)),
  ]);
  const sourceUrls = JSON.stringify([
    ...new Set(rawArticles.map((a) => a.original_url)),
  ]);
  const eventDate =
    rawArticles[0].published_at ?? new Date().toISOString().split("T")[0];

  // Check which languages already exist
  const existingLangs = new Set(
    (queries.getExistingArticleLangs.all(event.id) as Array<{ lang: string }>).map(
      (r) => r.lang,
    ),
  );

  const langsToProcess = LANG_CODES.filter((l) => !existingLangs.has(l));
  if (langsToProcess.length === 0) {
    log.info("All languages already exist for event", { eventId: event.id });
    return 0;
  }

  let articlesCreated = 0;

  // Process in batches of BATCH_SIZE languages per API call
  for (let i = 0; i < langsToProcess.length; i += BATCH_SIZE) {
    const batchLangs = langsToProcess.slice(i, i + BATCH_SIZE);
    const langInfos = batchLangs.map((code) => ({
      code,
      name: LANGUAGES[code].name,
    }));

    try {
      let results;

      if (batchLangs.length === 1) {
        // Single language — use simple prompt
        const systemPrompt = buildSystemPrompt(langInfos[0].name, event.category, eventDate);
        const userPrompt = buildUserPrompt(sources, langInfos[0].name);
        results = await callLLMWithRetry(
          config.llmApiKey, config.llmModel,
          systemPrompt, userPrompt,
          config.llmBaseUrl, 2048,
        );
        // Tag with lang code
        for (const r of results) r.lang = batchLangs[0];
      } else {
        // Batch — multiple languages in one call
        const systemPrompt = buildBatchSystemPrompt(langInfos, event.category, eventDate);
        const userPrompt = buildBatchUserPrompt(sources, langInfos);
        results = await callLLMWithRetry(
          config.llmApiKey, config.llmModel,
          systemPrompt, userPrompt,
          config.llmBaseUrl, 2048 * batchLangs.length,
        );
      }

      // Insert each article
      for (const result of results) {
        const lang = result.lang ?? batchLangs[0];
        if (!(batchLangs as string[]).includes(lang)) {
          log.warn("LLM returned unexpected lang", { eventId: event.id, lang });
          continue;
        }

        const wordCount = result.body.split(/\s+/).filter(Boolean).length;

        queries.insertArticle.run(
          event.id, lang, result.slug, result.title,
          result.body, result.meta_description, imageUrl, imageSource,
          sourceNames, sourceUrls, wordCount,
        );

        articlesCreated++;
        log.info("Article created", {
          eventId: event.id, lang, slug: result.slug, words: wordCount,
        });
      }

      // Check if any batch languages are missing from results — retry individually
      const returnedLangs = new Set(results.map((r) => r.lang));
      const missingLangs = batchLangs.filter((l) => !returnedLangs.has(l));

      for (const lang of missingLangs) {
        try {
          const langName = LANGUAGES[lang].name;
          const systemPrompt = buildSystemPrompt(langName, event.category, eventDate);
          const userPrompt = buildUserPrompt(sources, langName);
          const fallbackResults = await callLLMWithRetry(
            config.llmApiKey, config.llmModel,
            systemPrompt, userPrompt,
            config.llmBaseUrl, 2048,
          );

          for (const result of fallbackResults) {
            const wordCount = result.body.split(/\s+/).filter(Boolean).length;
            queries.insertArticle.run(
              event.id, lang, result.slug, result.title,
              result.body, result.meta_description, imageUrl, imageSource,
              sourceNames, sourceUrls, wordCount,
            );
            articlesCreated++;
            log.info("Article created (fallback)", {
              eventId: event.id, lang, slug: result.slug,
            });
          }
        } catch (err) {
          log.error("Fallback rewrite failed", {
            eventId: event.id, lang, error: String(err),
          });
        }
      }
    } catch (err) {
      log.error("Batch rewrite failed", {
        eventId: event.id,
        langs: batchLangs,
        error: String(err),
      });

      // Fallback: retry each language individually
      for (const lang of batchLangs) {
        try {
          const langName = LANGUAGES[lang].name;
          const systemPrompt = buildSystemPrompt(langName, event.category, eventDate);
          const userPrompt = buildUserPrompt(sources, langName);
          const results = await callLLMWithRetry(
            config.llmApiKey, config.llmModel,
            systemPrompt, userPrompt,
            config.llmBaseUrl, 2048,
          );

          for (const result of results) {
            const wordCount = result.body.split(/\s+/).filter(Boolean).length;
            queries.insertArticle.run(
              event.id, lang, result.slug, result.title,
              result.body, result.meta_description, imageUrl, imageSource,
              sourceNames, sourceUrls, wordCount,
            );
            articlesCreated++;
            log.info("Article created (individual fallback)", {
              eventId: event.id, lang, slug: result.slug,
            });
          }
        } catch (innerErr) {
          log.error("Individual rewrite failed", {
            eventId: event.id, lang, error: String(innerErr),
          });
        }
      }
    }
  }

  if (articlesCreated > 0) {
    queries.markEventPublished.run(event.id);
    log.info("Event published", {
      eventId: event.id,
      articles: articlesCreated,
      total: langsToProcess.length,
    });
  }

  return articlesCreated;
}
