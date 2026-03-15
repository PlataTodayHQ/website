export function buildRewriteSystemPrompt(
  targetLanguage: string,
  langCode: string,
  category: string,
): string {
  return `You are a news editor fluent in ${targetLanguage}. Rewrite the following Spanish news article about Argentina as if it were originally written in ${targetLanguage} for a native-speaking audience.

## Approach
This is NOT a translation — it is a rewrite. The result must read as polished, native-quality ${targetLanguage} journalism.

## Writing quality
- Write with the natural rhythm, idioms, and style that native ${targetLanguage} speakers expect from quality journalism.
- Use sentence structures and transitions natural to ${targetLanguage} — do not mirror Spanish syntax.
- Vary sentence length: mix short punchy sentences with longer explanatory ones.
- Open with a strong, engaging lead.
${getLanguageGuidance(langCode)}

## Content rules
- Preserve ALL facts, quotes, names, numbers, and data — do not add or omit anything.
- Translate quotes into ${targetLanguage}.
- Contextualize Argentine references (institutions, political figures, local terms) briefly for readers unfamiliar with Argentina.
- Preserve source attribution from the original article. When the Spanish text attributes a fact to a specific source (e.g., "según Infobae"), maintain that attribution in ${targetLanguage}.

## Format
- Headline: compelling and SEO-optimized in ${targetLanguage}. Include "Argentina" when it adds clarity.
- Slug: URL-friendly in ${targetLanguage} (use transliteration for non-Latin scripts).
- Body: use ## subheadings, **bold** for key names/data, *italic* for emphasis. Paragraphs separated by double newlines. No bullet points or numbered lists.

Respond in JSON:
{
  "title": "Compelling SEO headline in ${targetLanguage}",
  "slug": "url-friendly-slug",
  "meta_description": "Engaging one-sentence summary for SEO in ${targetLanguage} (max 160 chars)",
  "body": "Full rewritten article with ## subheadings, **bold**, *italic*, paragraphs separated by double newlines"
}

Category: ${category}`;
}

function getLanguageGuidance(langCode: string): string {
  switch (langCode) {
    case "de":
      return `
## German-specific guidelines
- Use formal "Sie" address throughout.
- Follow German press style (Nachrichtenstil): lead with the key fact, then context.
- Compound nouns are natural and expected in German news.
- Use German conventions for numbers: periods as thousands separators, commas for decimals.`;
    case "fr":
      return `
## French-specific guidelines
- Use formal "vous" address.
- Follow AFP-style journalistic conventions.
- Use French number formatting: spaces as thousands separators, commas for decimals.
- Respect French punctuation rules (space before :, ;, ?, !).`;
    case "pt":
      return `
## Portuguese-specific guidelines
- Write for a Brazilian Portuguese audience, not European Portuguese.
- Use informal "você" as is standard in Brazilian media.
- Contextualize Argentine institutions with comparisons to Brazilian equivalents where helpful.`;
    case "ja":
      return `
## Japanese-specific guidelines
- Use desu/masu (です/ます) polite style throughout.
- Provide readings in parentheses for uncommon kanji on first use.
- Follow Japanese news conventions: lead paragraph, then details in inverted pyramid.
- Use full-width punctuation (。、「」).`;
    case "zh":
      return `
## Chinese-specific guidelines
- Use Simplified Chinese characters and mainland Chinese conventions.
- Follow Xinhua-style news formatting.
- Use Chinese punctuation (。，、「」).
- Translate institutional names into standard Chinese equivalents where established.`;
    case "zh-tw":
      return `
## Traditional Chinese-specific guidelines
- Use Traditional Chinese characters and Taiwanese conventions.
- Follow Taiwanese media formatting norms.
- Use appropriate punctuation (。，、「」).`;
    case "ko":
      return `
## Korean-specific guidelines
- Use formal hamnida (합니다) style for news reporting.
- Follow Korean news conventions for structure and flow.
- Transliterate Argentine names using standard Korean romanization conventions.`;
    case "hi":
      return `
## Hindi-specific guidelines
- Use Devanagari script throughout.
- Mix Hindi with English for technical, financial, and institutional terms as is standard in Indian media.
- Use respectful forms of address.`;
    case "ru":
      return `
## Russian-specific guidelines
- Use formal style as in TASS or RIA Novosti reporting.
- Transliterate Argentine names according to standard Russian conventions.
- Provide extra context for Argentine institutions — explain equivalents for Russian readers.`;
    case "uk":
      return `
## Ukrainian-specific guidelines
- Use formal journalistic style.
- Transliterate Argentine names according to Ukrainian conventions.
- Provide context for Argentine institutions relevant to Ukrainian readers.`;
    case "ar":
      return `
## Arabic-specific guidelines
- Use Modern Standard Arabic (fusha) throughout.
- Follow Al Jazeera-style formatting.
- Use Arabic-Indic numerals or Western Arabic numerals consistently.`;
    case "pl":
      return `
## Polish-specific guidelines
- Use formal journalistic style as in PAP reporting.
- Apply proper Polish declension for Argentine proper nouns where applicable.`;
    case "sv":
    case "da":
    case "no":
    case "fi":
      return `
## Nordic language guidelines
- Use the standard journalistic style for your language.
- Follow local press conventions for number formatting and quotation marks.`;
    case "nl":
      return `
## Dutch-specific guidelines
- Use standard journalistic Dutch (not Belgian Dutch unless specified).
- Follow ANP-style formatting conventions.`;
    default:
      return `
## Language guidelines
- Follow local journalism conventions and style norms for ${langCode}.
- Use appropriate formal/informal register as standard in quality news media.`;
  }
}

export function buildRewriteUserPrompt(
  article: { title: string; body: string; meta_description: string },
  targetLanguage: string,
): string {
  return `## Spanish Source Article

Title: ${article.title}
Meta: ${article.meta_description}

${article.body}

Rewrite this article in ${targetLanguage} for a native-speaking audience. Preserve source attribution. Respond in JSON.`;
}
