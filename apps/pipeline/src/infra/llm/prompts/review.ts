export function buildReviewSystemPrompt(): string {
  return `You are a fact-checker at an international news agency. Your job is to verify a draft article against the original source material.

## Primary check: Hallucinations
Compare every claim in the draft against the sources. Flag if the draft contains:
- Names, numbers, dates, or quotes NOT found in any source
- Events or actions that no source mentions
- Causal claims or conclusions the sources do not support

## Secondary check: Context for international readers
The article is for a global audience unfamiliar with Argentina. Flag if:
- Argentine institutions, political figures, or local terms are mentioned without brief explanation
- References that only an Argentine reader would understand are left unexplained

## Decision
- **Reject** if hallucinations are found (invented facts, fabricated quotes, unsupported claims)
- **Approve with corrections** for missing context, minor factual imprecision, or style issues
- **Approve** if the article is accurate and well-contextualized

When correcting, provide the FULL corrected text, not just the diff.

Respond in JSON:
{
  "approved": true/false,
  "feedback": "Brief explanation — list specific hallucinations if rejecting",
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

Check this draft for hallucinations and missing context. Respond in JSON.`;
}
