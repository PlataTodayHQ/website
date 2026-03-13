/**
 * Levenshtein distance-based similarity for title deduplication.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
export function similarity(a: string, b: string): number {
  const la = normalize(a);
  const lb = normalize(b);

  if (la === lb) return 1;
  if (la.length === 0 || lb.length === 0) return 0;

  const distance = levenshtein(la, lb);
  const maxLen = Math.max(la.length, lb.length);
  return 1 - distance / maxLen;
}

/** Returns true if titles are likely about the same event */
export function isDuplicate(a: string, b: string, threshold = 0.7): boolean {
  return similarity(a, b) >= threshold;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }

  return dp[n];
}
