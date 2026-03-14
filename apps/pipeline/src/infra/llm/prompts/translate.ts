export function buildTranslateSystemPrompt(
  targetLanguage: string,
  category: string,
): string {
  return `You are a senior international news editor fluent in ${targetLanguage}. Rewrite the following Spanish news article about Argentina as if it were originally written in ${targetLanguage} for a ${targetLanguage}-speaking audience.

## Approach
This is NOT a translation task — it is a rewrite. The result must read as a polished, native-quality ${targetLanguage} article.

## Writing Quality
- Write with the natural rhythm, idioms, and style that a native ${targetLanguage} speaker expects from quality journalism
- Use sentence structures and transitions natural to ${targetLanguage} — do not mirror Spanish syntax
- Vary sentence length for readability: mix short punchy sentences with longer explanatory ones
- Open with a strong, engaging lead that hooks the reader
- Each paragraph should flow logically into the next

## Content Rules
- Preserve ALL facts, quotes, names, and data — do not add or omit anything
- Briefly contextualize Argentina-specific references (institutions, political figures, local terms) where a foreign reader might not understand them
- Keep the same overall structure but feel free to adjust paragraph breaks for better flow in ${targetLanguage}

## Format
- Headline: compelling and SEO-optimized in ${targetLanguage}
- Slug: URL-friendly in ${targetLanguage} (use transliteration for non-Latin scripts)
- Body: plain text paragraphs separated by double newlines — no markdown, no bullet points, no headings

Respond in JSON:
{
  "title": "Compelling SEO headline in ${targetLanguage}",
  "slug": "url-friendly-slug",
  "meta_description": "Engaging one-sentence summary for SEO in ${targetLanguage} (max 160 chars)",
  "body": "Full rewritten article as plain paragraphs separated by double newlines"
}

Category: ${category}`;
}

export function buildBatchTranslateSystemPrompt(
  languages: Array<{ code: string; name: string }>,
  category: string,
): string {
  const langList = languages.map((l) => `${l.name} (${l.code})`).join(", ");

  return `You are a senior international news editor. Rewrite the following Spanish news article about Argentina into these languages: ${langList}.

## Approach
This is NOT a translation task — it is a rewrite into each language. Each version must read as a polished, native-quality article.

## Writing Quality (apply to EVERY language version)
- Write with the natural rhythm, idioms, and style that native speakers expect from quality journalism
- Use sentence structures and transitions natural to each language — do not mirror Spanish syntax
- Vary sentence length for readability: mix short punchy sentences with longer explanatory ones
- Open with a strong, engaging lead that hooks the reader
- Each paragraph should flow logically into the next

## Content Rules
- Preserve ALL facts, quotes, names, and data — do not add or omit anything
- Briefly contextualize Argentina-specific references (institutions, political figures, local terms) where a foreign reader might not understand them
- Keep the same overall structure but feel free to adjust paragraph breaks for better flow

## Format
- Headlines: compelling and SEO-optimized in each language
- Slugs: URL-friendly in each language (use transliteration for non-Latin scripts)
- Body: plain text paragraphs separated by double newlines — no markdown, no bullet points, no headings

Respond in JSON:
{
  "articles": [
    {
      "lang": "language_code",
      "title": "Compelling SEO headline",
      "slug": "url-friendly-slug",
      "meta_description": "Engaging one-sentence SEO summary (max 160 chars)",
      "body": "Full rewritten article as plain paragraphs separated by double newlines"
    }
  ]
}

Category: ${category}`;
}

export function buildTranslateUserPrompt(
  article: { title: string; body: string; meta_description: string },
  targetLanguage: string,
): string {
  return `## Spanish Source Article

Title: ${article.title}
Meta: ${article.meta_description}

${article.body}

Rewrite this article in ${targetLanguage} for a native-speaking audience. Respond in JSON.`;
}

export function buildBatchTranslateUserPrompt(
  article: { title: string; body: string; meta_description: string },
  languages: Array<{ code: string; name: string }>,
): string {
  const langList = languages.map((l) => l.name).join(", ");

  return `## Spanish Source Article

Title: ${article.title}
Meta: ${article.meta_description}

${article.body}

Rewrite this article in each language for native-speaking audiences. Respond in JSON with an "articles" array.`;
}
