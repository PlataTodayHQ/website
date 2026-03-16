import { sleep, LANGUAGES, type LangCode, log } from "@plata-today/shared";
import type { ZodSchema } from "zod";
import type {
  SourceText, TriageResult, DraftResult,
  ReviewResult, RewriteResult, ValidateRewriteResult,
} from "../../domain/entities.js";
import {
  triageSchema, draftSchema, reviewSchema,
  rewriteSchema, validateRewriteSchema,
} from "../../domain/schemas.js";
import type { ILLMService, DraftInput } from "../../ports/llm-service.js";
import type { PipelineMetrics } from "../../domain/metrics.js";
import { buildTriageSystemPrompt, buildTriageUserPrompt } from "./prompts/triage.js";
import { buildDraftSystemPrompt, buildDraftUserPrompt } from "./prompts/draft.js";
import { buildReviewSystemPrompt, buildReviewUserPrompt } from "./prompts/review.js";
import { buildRewriteSystemPrompt, buildRewriteUserPrompt } from "./prompts/rewrite.js";
import { buildValidateRewriteSystemPrompt, buildValidateRewriteUserPrompt } from "./prompts/validate-rewrite.js";

class LLMAPIError extends Error {
  constructor(
    public status: number,
    public responseBody: string,
  ) {
    super(`OpenAI API error ${status}: ${responseBody.slice(0, 200)}`);
  }
}

class LLMValidationError extends Error {
  constructor(message: string) {
    super(`LLM response validation failed: ${message}`);
  }
}

// Per-stage timeout configuration (ms)
const STAGE_TIMEOUTS = {
  triage: 30_000,
  draft: 120_000,
  review: 90_000,
  rewrite: 120_000,
  validate: 60_000,
} as const;

export class OpenAILLMService implements ILLMService {
  private metrics: PipelineMetrics | null = null;

  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string = "https://api.openai.com/v1",
  ) {}

  setMetrics(metrics: PipelineMetrics): void {
    this.metrics = metrics;
  }

  async triage(sources: SourceText[]): Promise<TriageResult> {
    const system = buildTriageSystemPrompt();
    const user = buildTriageUserPrompt(sources);
    return await this.callJsonValidated(system, user, triageSchema, STAGE_TIMEOUTS.triage) as TriageResult;
  }

  async draft(sources: SourceText[], category: string, date: string, feedbackPrompt?: string): Promise<DraftResult> {
    const system = buildDraftSystemPrompt(category, date);
    const user = buildDraftUserPrompt(sources) + (feedbackPrompt ?? "");
    const json = await this.callJsonValidated(system, user, draftSchema, STAGE_TIMEOUTS.draft);
    const articles = parseArticleResponse(json);
    if (articles.length === 0) throw new Error("Draft returned no articles");
    const a = articles[0];
    return {
      title: a.title,
      slug: a.slug,
      meta_description: a.meta_description,
      body: a.body,
    };
  }

  async review(draft: DraftInput, sources: SourceText[]): Promise<ReviewResult> {
    const system = buildReviewSystemPrompt();
    const user = buildReviewUserPrompt(draft, sources);
    return await this.callJsonValidated(system, user, reviewSchema, STAGE_TIMEOUTS.review) as ReviewResult;
  }

  async rewrite(article: DraftInput, lang: string, category: string): Promise<RewriteResult> {
    const langName = LANGUAGES[lang as LangCode].name;
    const system = buildRewriteSystemPrompt(langName, lang, category);
    const user = buildRewriteUserPrompt(article, langName);
    const json = await this.callJsonValidated(system, user, rewriteSchema, STAGE_TIMEOUTS.rewrite);
    const articles = parseArticleResponse(json);
    if (articles.length === 0) throw new Error("Rewrite returned no articles");
    return { ...articles[0], lang };
  }

  async validateRewrite(original: DraftInput, rewrite: DraftInput, lang: string): Promise<ValidateRewriteResult> {
    const langName = LANGUAGES[lang as LangCode].name;
    const system = buildValidateRewriteSystemPrompt(langName);
    const user = buildValidateRewriteUserPrompt(original, rewrite, langName);
    return await this.callJsonValidated(system, user, validateRewriteSchema, STAGE_TIMEOUTS.validate) as ValidateRewriteResult;
  }

  private async callJsonValidated(
    systemPrompt: string,
    userPrompt: string,
    schema: ZodSchema,
    timeoutMs: number,
    maxRetries = 3,
  ): Promise<unknown> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const raw = await this.callJson(systemPrompt, userPrompt, timeoutMs);
        const result = schema.safeParse(raw);
        if (result.success) return result.data;

        const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        log.warn("LLM response validation failed", { attempt, issues });

        if (attempt < maxRetries) {
          this.metrics?.incrementLlmErrors();
          continue;
        }
        throw new LLMValidationError(issues);
      } catch (err) {
        if (err instanceof LLMAPIError) {
          if ((err.status === 429 || err.status >= 500) && attempt < maxRetries) {
            const delay = Math.min(1000 * 2 ** attempt, 30000);
            log.warn("LLM API retry", { attempt, status: err.status, delayMs: delay });
            this.metrics?.incrementLlmErrors();
            await sleep(delay);
            continue;
          }
        }
        if (err instanceof LLMValidationError) throw err;
        throw err;
      }
    }
    throw new Error("LLM API: max retries exceeded");
  }

  private async callJson(
    systemPrompt: string,
    userPrompt: string,
    timeoutMs: number,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    this.metrics?.incrementLlmCalls();

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!response.ok) {
      const body = await response.text();
      throw new LLMAPIError(response.status, body);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    // Track token usage
    if (data.usage && this.metrics) {
      this.metrics.addTokens(data.usage.prompt_tokens ?? 0, data.usage.completion_tokens ?? 0);
    }

    const text = data.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from LLM");

    return parseJsonResponse(text);
  }
}

/**
 * Parse JSON from LLM response with progressive cleanup strategies.
 */
function parseJsonResponse(text: string): unknown {
  // Strategy 1: Strip markdown code fences
  const cleaned = text.replace(/^```(?:json)?\n?|\n?```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Strategy 2: Extract JSON between first { and last }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {
        // fall through
      }
    }
    log.error("Failed to parse LLM JSON response", { text: text.slice(0, 500) });
    throw new Error("Failed to parse LLM response as JSON");
  }
}

function parseArticleResponse(parsed: unknown): RewriteResult[] {
  const obj = parsed as Record<string, unknown>;
  const articles: unknown[] = obj.articles ? (obj.articles as unknown[]) : [parsed];

  return articles.map((item: unknown) => {
    const a = item as Record<string, unknown>;
    // Normalize literal \n sequences that sometimes survive JSON parsing
    const body = String(a.body ?? "").replace(/\\n/g, "\n");
    return {
      title: String(a.title ?? ""),
      slug: sanitizeSlug(String(a.slug ?? "")),
      meta_description: String(a.meta_description ?? "").slice(0, 160),
      body,
      lang: a.lang ? String(a.lang) : undefined,
    };
  });
}

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0980-\u09FF\u0E00-\u0E7F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
