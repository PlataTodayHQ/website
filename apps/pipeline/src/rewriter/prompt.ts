export function buildSystemPrompt(
  targetLanguage: string,
  category: string,
  eventDate: string,
): string {
  return `You are a professional news journalist. Given source articles about an event, write an original news article in ${targetLanguage}.

Rules:
- Write a completely original article, not a translation
- Synthesize facts from all sources into one coherent piece
- Use journalistic style appropriate for ${targetLanguage} audience
- Include: headline, lead paragraph, body (3-5 paragraphs)
- Do NOT copy phrases or sentence structures from sources
- Do NOT add opinions or analysis not present in sources
- Do NOT hallucinate facts — only use information from provided sources
- Target length: 200-400 words
- Write headline optimized for SEO in ${targetLanguage}

Respond in JSON format:
{
  "title": "SEO-optimized headline",
  "slug": "url-friendly-slug-in-target-language",
  "meta_description": "One sentence summary for SEO (max 160 chars)",
  "body": "Full article text as plain paragraphs separated by double newlines. Do NOT use markdown headings, bullet points, or formatting — just plain text paragraphs."
}

Category: ${category}
Event date: ${eventDate}`;
}

export function buildBatchSystemPrompt(
  languages: Array<{ code: string; name: string }>,
  category: string,
  eventDate: string,
): string {
  const langList = languages.map((l) => `${l.name} (${l.code})`).join(", ");

  return `You are a professional multilingual news journalist. Given source articles about an event, write original news articles in the following languages: ${langList}.

Rules:
- Write completely original articles, not translations
- Synthesize facts from all sources into coherent pieces
- Use journalistic style appropriate for each language's audience
- Include: headline, lead paragraph, body (3-5 paragraphs)
- Do NOT copy phrases or sentence structures from sources
- Do NOT add opinions or analysis not present in sources
- Do NOT hallucinate facts — only use information from provided sources
- Target length: 200-400 words per article
- Write headlines optimized for SEO in each language

Respond in JSON format:
{
  "articles": [
    {
      "lang": "language_code",
      "title": "SEO-optimized headline",
      "slug": "url-friendly-slug-in-target-language",
      "meta_description": "One sentence summary for SEO (max 160 chars)",
      "body": "Full article text as plain paragraphs separated by double newlines. Do NOT use markdown headings, bullet points, or formatting — just plain text paragraphs."
    }
  ]
}

Category: ${category}
Event date: ${eventDate}`;
}

export function buildUserPrompt(
  sources: Array<{ name: string; text: string }>,
  targetLanguage: string,
): string {
  const sourcesText = sources
    .map((s, i) => `Source ${i + 1} (${s.name}):\n${s.text}`)
    .join("\n\n");

  return `${sourcesText}\n\nWrite an original ${targetLanguage} news article about this event. Respond in JSON.`;
}

export function buildBatchUserPrompt(
  sources: Array<{ name: string; text: string }>,
  languages: Array<{ code: string; name: string }>,
): string {
  const sourcesText = sources
    .map((s, i) => `Source ${i + 1} (${s.name}):\n${s.text}`)
    .join("\n\n");

  const langList = languages.map((l) => l.name).join(", ");

  return `${sourcesText}\n\nWrite original news articles in these languages: ${langList}. Respond in JSON with an "articles" array.`;
}
