export function buildTranslateSystemPrompt(
  targetLanguage: string,
  category: string,
): string {
  return `You are a professional news translator. Translate the following Spanish news article into ${targetLanguage}.

## Rules
- Translate accurately, preserving all facts and the journalistic tone
- Adapt the style for a ${targetLanguage}-speaking audience (natural phrasing, not literal translation)
- The headline must be SEO-optimized in ${targetLanguage}
- The slug must be URL-friendly in ${targetLanguage}
- Keep the same paragraph structure as the original
- Do NOT add, remove, or change any facts
- Body must be plain text paragraphs separated by double newlines — no markdown

Respond in JSON:
{
  "title": "SEO-optimized headline in ${targetLanguage}",
  "slug": "url-friendly-slug-in-target-language",
  "meta_description": "One sentence summary for SEO in ${targetLanguage} (max 160 chars)",
  "body": "Full translated article as plain paragraphs separated by double newlines"
}

Category: ${category}`;
}

export function buildBatchTranslateSystemPrompt(
  languages: Array<{ code: string; name: string }>,
  category: string,
): string {
  const langList = languages.map((l) => `${l.name} (${l.code})`).join(", ");

  return `You are a professional news translator. Translate the following Spanish news article into these languages: ${langList}.

## Rules
- Translate accurately, preserving all facts and the journalistic tone
- Adapt the style for each target audience (natural phrasing, not literal translation)
- Headlines must be SEO-optimized in each language
- Slugs must be URL-friendly in each language
- Keep the same paragraph structure as the original
- Do NOT add, remove, or change any facts
- Body must be plain text paragraphs separated by double newlines — no markdown

Respond in JSON:
{
  "articles": [
    {
      "lang": "language_code",
      "title": "SEO-optimized headline",
      "slug": "url-friendly-slug",
      "meta_description": "One sentence SEO summary (max 160 chars)",
      "body": "Full translated article as plain paragraphs"
    }
  ]
}

Category: ${category}`;
}

export function buildTranslateUserPrompt(
  article: { title: string; body: string; meta_description: string },
  targetLanguage: string,
): string {
  return `## Spanish Article

Title: ${article.title}
Meta: ${article.meta_description}

${article.body}

Translate this article into ${targetLanguage}. Respond in JSON.`;
}

export function buildBatchTranslateUserPrompt(
  article: { title: string; body: string; meta_description: string },
  languages: Array<{ code: string; name: string }>,
): string {
  const langList = languages.map((l) => l.name).join(", ");

  return `## Spanish Article

Title: ${article.title}
Meta: ${article.meta_description}

${article.body}

Translate this article into: ${langList}. Respond in JSON with an "articles" array.`;
}
