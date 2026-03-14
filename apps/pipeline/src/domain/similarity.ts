/**
 * Pure similarity and clustering functions. Zero external dependencies.
 */

export function similarity(a: string, b: string): number {
  const la = normalize(a);
  const lb = normalize(b);
  if (la === lb) return 1;
  if (la.length === 0 || lb.length === 0) return 0;
  const distance = levenshtein(la, lb);
  return 1 - distance / Math.max(la.length, lb.length);
}

export function isDuplicate(a: string, b: string, threshold = 0.7): boolean {
  return similarity(a, b) >= threshold;
}

export function keywordOverlap(textA: string, textB: string): number {
  const wordsA = extractKeywords(textA);
  const wordsB = extractKeywords(textB);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

interface ClusterCandidate {
  title: string;
  body: string;
  category: string | null;
  published_at: string | null;
}

export function computeClusterScore(a: ClusterCandidate, b: ClusterCandidate): number {
  const titleSim = similarity(a.title, b.title);
  const bodySim = keywordOverlap(a.body ?? "", b.body ?? "");
  const timeSim = temporalProximity(a.published_at, b.published_at);
  const catMatch = (a.category && b.category && a.category === b.category) ? 1.0 : 0;
  return titleSim * 0.5 + bodySim * 0.3 + timeSim * 0.1 + catMatch * 0.1;
}

export function isClusterMatch(a: ClusterCandidate, b: ClusterCandidate, threshold = 0.55): boolean {
  return computeClusterScore(a, b) >= threshold;
}

// --- internals ---

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "el", "la", "los", "las", "un", "una", "de", "del", "en", "con", "por",
  "para", "que", "se", "al", "es", "su", "son", "como", "mas", "pero",
  "si", "ya", "fue", "ser", "hay", "sin", "sobre", "entre", "tiene",
  "the", "a", "an", "and", "or", "of", "to", "in", "is", "it", "for",
  "on", "with", "at", "by", "from", "this", "that", "was", "are", "be",
]);

function extractKeywords(text: string): Set<string> {
  const words = normalize(text).split(" ");
  const keywords = new Set<string>();
  for (const w of words) {
    if (w.length >= 4 && !STOP_WORDS.has(w)) keywords.add(w);
  }
  return keywords;
}

function temporalProximity(dateA: string | null, dateB: string | null): number {
  if (!dateA || !dateB) return 0.5;
  const diff = Math.abs(new Date(dateA).getTime() - new Date(dateB).getTime());
  const sixHours = 6 * 60 * 60 * 1000;
  if (diff <= sixHours) return 1.0;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  if (diff >= twentyFourHours) return 0;
  return 1.0 - (diff - sixHours) / (twentyFourHours - sixHours);
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
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}
