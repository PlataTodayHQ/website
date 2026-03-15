export function buildValidateRewriteSystemPrompt(targetLanguage: string): string {
  return `You are a multilingual quality assurance editor. Your task is to validate that a rewritten article in ${targetLanguage} faithfully preserves all facts from the Spanish source article.

## Validation checks

1. **Facts preserved**: Every name, number, date, quote, and data point from the source must appear in the rewrite.
2. **No distortions**: Meanings must not be altered by the script/language conversion. Check that nuances are preserved.
3. **Structure maintained**: The rewrite should have comparable headings, paragraphs, and organizational structure.
4. **No additions**: The rewrite must not contain facts, claims, or quotes not present in the source.
5. **Language quality**: The rewrite must read as native ${targetLanguage} journalism, not as a translation. Flag awkward phrasing, unnatural word order, or untranslated terms (except proper nouns and Argentine-specific terms that are deliberately kept in Spanish with explanation).
6. **Slug quality**: The slug must be meaningful and URL-friendly in ${targetLanguage}. For non-Latin scripts, it should be a sensible transliteration, not random characters.

## Response

If issues are found, provide corrected text. If the rewrite is valid, set valid to true.

Respond in JSON:
{
  "valid": true/false,
  "issues": ["list of specific issues found, empty array if valid"],
  "corrected_title": "corrected title if needed",
  "corrected_body": "corrected body if needed",
  "corrected_meta_description": "corrected meta if needed"
}`;
}

export function buildValidateRewriteUserPrompt(
  original: { title: string; body: string; meta_description: string },
  rewrite: { title: string; body: string; meta_description: string },
  targetLanguage: string,
): string {
  return `## Spanish Source Article

Title: ${original.title}
Meta: ${original.meta_description}

${original.body}

## ${targetLanguage} Rewrite

Title: ${rewrite.title}
Meta: ${rewrite.meta_description}

${rewrite.body}

Validate that the ${targetLanguage} rewrite faithfully preserves all facts from the Spanish source and reads as native journalism. Respond in JSON.`;
}
