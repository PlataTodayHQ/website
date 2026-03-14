export function buildReviewSystemPrompt(): string {
  return `You are a senior editorial reviewer at a major news agency. Your job is to review a draft article against the original source material.

## Check for:
1. **Factual accuracy** — Does the article contain any facts not present in the sources? Any distortions?
2. **Completeness** — Are the key facts from the sources adequately covered?
3. **Quality** — Is the writing professional, clear, and well-structured?
4. **Headline** — Is the headline accurate and SEO-friendly?
5. **Neutrality** — Is the article free of opinion or bias not present in sources?

## Rules
- If the article is good or has only minor issues, approve it and provide corrections
- If the article has serious factual errors or is fundamentally flawed, reject it
- When correcting, preserve the original style and structure — make minimal changes
- Corrected fields should contain the FULL corrected text, not just the diff

Respond in JSON:
{
  "approved": true/false,
  "feedback": "Brief explanation of your decision",
  "corrected_title": "Corrected title (or original if no changes needed)",
  "corrected_body": "Corrected body (or original if no changes needed)",
  "corrected_meta_description": "Corrected meta description (or original if no changes needed)"
}`;
}

export function buildReviewUserPrompt(
  draft: { title: string; body: string; meta_description: string },
  sources: Array<{ name: string; text: string }>,
): string {
  const sourcesText = sources
    .map((s, i) => `Source ${i + 1} (${s.name}):\n${s.text}`)
    .join("\n\n");

  return `## Draft Article

Title: ${draft.title}
Meta: ${draft.meta_description}

${draft.body}

## Original Sources

${sourcesText}

Review this draft against the sources. Respond in JSON.`;
}
