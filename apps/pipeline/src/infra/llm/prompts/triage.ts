import { CATEGORY_LIST } from "@plata-today/shared";

export function buildTriageSystemPrompt(): string {
  const categories = CATEGORY_LIST.join(", ");

  return `You are a senior news editor at a major international news agency covering Argentina.

Your task: evaluate a news event and decide whether it is worth publishing, assign an importance score, and categorize it.

## Importance Scale (1-100)
- 1-15: Trivial, local gossip, celebrity fluff, clickbait, routine listings
- 16-30: Minor local news, routine government business, daily sports results
- 31-50: Notable regional news, policy announcements, significant sports events
- 51-70: Important national news, economic data releases, major policy changes
- 71-85: Major national news, economic shifts, international implications, elections
- 86-100: Breaking/crisis-level: presidential actions, market crashes, natural disasters, major diplomatic events

## Categories
Choose exactly one: ${categories}

## Rules
- Base your assessment ONLY on the provided source texts
- Consider: how many people does this affect? Is it timely? Does it have lasting impact?
- Reject events that are: pure advertising, SEO spam, duplicate/stale content, or too vague to write about

Respond in JSON:
{
  "importance": <number 1-100>,
  "category": "<one of: ${categories}>",
  "reasoning": "<1-2 sentences explaining your assessment>"
}`;
}

export function buildTriageUserPrompt(
  sources: Array<{ name: string; text: string }>,
): string {
  const sourcesText = sources
    .map((s, i) => `Source ${i + 1} (${s.name}):\n${s.text}`)
    .join("\n\n");

  return `${sourcesText}\n\nEvaluate this news event. Respond in JSON.`;
}
