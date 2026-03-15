/**
 * Accumulates pipeline run metrics for tracking and persistence.
 */
export class PipelineMetrics {
  scraped = 0;
  inserted = 0;
  enriched = 0;
  newClusters = 0;
  triaged = 0;
  killedTriage = 0;
  drafted = 0;
  reviewedPass = 0;
  reviewedFail = 0;
  rewritesCreated = 0;
  rewritesFailed = 0;
  published = 0;
  llmCalls = 0;
  llmErrors = 0;
  promptTokens = 0;
  completionTokens = 0;

  incrementLlmCalls(): void {
    this.llmCalls++;
  }

  incrementLlmErrors(): void {
    this.llmErrors++;
  }

  addTokens(prompt: number, completion: number): void {
    this.promptTokens += prompt;
    this.completionTokens += completion;
  }

  toRecord(): Record<string, number> {
    return {
      scraped: this.scraped,
      inserted: this.inserted,
      enriched: this.enriched,
      new_clusters: this.newClusters,
      triaged: this.triaged,
      killed_triage: this.killedTriage,
      drafted: this.drafted,
      reviewed_pass: this.reviewedPass,
      reviewed_fail: this.reviewedFail,
      rewrites_created: this.rewritesCreated,
      rewrites_failed: this.rewritesFailed,
      published: this.published,
      llm_calls: this.llmCalls,
      llm_errors: this.llmErrors,
      prompt_tokens: this.promptTokens,
      completion_tokens: this.completionTokens,
    };
  }
}
