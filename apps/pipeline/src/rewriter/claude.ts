import { log } from "../logger.js";

export interface RewrittenArticle {
  title: string;
  slug: string;
  meta_description: string;
  body: string;
  lang?: string;
}

export class LLMAPIError extends Error {
  constructor(
    public status: number,
    public responseBody: string,
  ) {
    super(`OpenAI API error ${status}: ${responseBody.slice(0, 200)}`);
  }
}

export async function callLLM(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  baseUrl = "https://api.openai.com/v1",
  maxTokens = 2048,
): Promise<RewrittenArticle[]> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new LLMAPIError(response.status, body);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const text = data.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from LLM");

  // Parse JSON — handle possible markdown code fences
  const jsonStr = text.replace(/^```(?:json)?\n?|\n?```$/g, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // Support both single article and batch (array of articles)
    const articles: unknown[] = parsed.articles ?? [parsed];

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
  } catch {
    log.error("Failed to parse LLM JSON response", {
      text: text.slice(0, 500),
    });
    throw new Error("Failed to parse LLM response as JSON");
  }
}

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLLMWithRetry(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  baseUrl = "https://api.openai.com/v1",
  maxTokens = 2048,
  maxRetries = 3,
): Promise<RewrittenArticle[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callLLM(apiKey, model, systemPrompt, userPrompt, baseUrl, maxTokens);
    } catch (err) {
      if (err instanceof LLMAPIError) {
        if ((err.status === 429 || err.status >= 500) && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          log.warn("LLM API retry", {
            attempt,
            status: err.status,
            delayMs: delay,
          });
          await sleep(delay);
          continue;
        }
      }
      throw err;
    }
  }
  throw new Error("LLM API: max retries exceeded");
}
