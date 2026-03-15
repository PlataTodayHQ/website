import { sleep, LANGUAGES, type LangCode, log } from "@plata-today/shared";
import type {
  SourceText, TriageResult, DraftResult,
  ReviewResult, RewriteResult, ValidateRewriteResult,
} from "../../domain/entities.js";
import type { ILLMService, DraftInput } from "../../ports/llm-service.js";
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

export class OpenAILLMService implements ILLMService {
  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string = "https://api.openai.com/v1",
  ) {}

  async triage(sources: SourceText[]): Promise<TriageResult> {
    const system = buildTriageSystemPrompt();
    const user = buildTriageUserPrompt(sources);
    return await this.callJsonWithRetry(system, user) as TriageResult;
  }

  async draft(sources: SourceText[], category: string, date: string): Promise<DraftResult> {
    const system = buildDraftSystemPrompt(category, date);
    const user = buildDraftUserPrompt(sources);
    const json = await this.callJsonWithRetry(system, user);
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
    return await this.callJsonWithRetry(system, user) as ReviewResult;
  }

  async rewrite(article: DraftInput, lang: string, category: string): Promise<RewriteResult> {
    const langName = LANGUAGES[lang as LangCode].name;
    const system = buildRewriteSystemPrompt(langName, category);
    const user = buildRewriteUserPrompt(article, langName);
    const json = await this.callJsonWithRetry(system, user);
    const articles = parseArticleResponse(json);
    if (articles.length === 0) throw new Error("Rewrite returned no articles");
    return { ...articles[0], lang };
  }

  async validateRewrite(original: DraftInput, rewrite: DraftInput, lang: string): Promise<ValidateRewriteResult> {
    const langName = LANGUAGES[lang as LangCode].name;
    const system = buildValidateRewriteSystemPrompt(langName);
    const user = buildValidateRewriteUserPrompt(original, rewrite, langName);
    return await this.callJsonWithRetry(system, user) as ValidateRewriteResult;
  }

  private async callJson(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
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
    };

    const text = data.choices[0]?.message?.content;
    if (!text) throw new Error("Empty response from LLM");

    const jsonStr = text.replace(/^```(?:json)?\n?|\n?```$/g, "").trim();

    try {
      return JSON.parse(jsonStr);
    } catch {
      log.error("Failed to parse LLM JSON response", { text: text.slice(0, 500) });
      throw new Error("Failed to parse LLM response as JSON");
    }
  }

  private async callJsonWithRetry(
    systemPrompt: string,
    userPrompt: string,
    maxRetries = 3,
  ): Promise<unknown> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.callJson(systemPrompt, userPrompt);
      } catch (err) {
        if (err instanceof LLMAPIError) {
          if ((err.status === 429 || err.status >= 500) && attempt < maxRetries) {
            const delay = Math.min(1000 * 2 ** attempt, 30000);
            log.warn("LLM API retry", { attempt, status: err.status, delayMs: delay });
            await sleep(delay);
            continue;
          }
        }
        throw err;
      }
    }
    throw new Error("LLM API: max retries exceeded");
  }
}

function parseArticleResponse(parsed: unknown): RewriteResult[] {
  const obj = parsed as Record<string, unknown>;
  const articles: unknown[] = obj.articles ? (obj.articles as unknown[]) : [parsed];

  return articles.map((item: unknown) => {
    const a = item as Record<string, unknown>;
    return {
      title: String(a.title ?? ""),
      slug: sanitizeSlug(String(a.slug ?? "")),
      meta_description: String(a.meta_description ?? "").slice(0, 160),
      body: String(a.body ?? ""),
      lang: a.lang ? String(a.lang) : undefined,
    };
  });
}

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}
