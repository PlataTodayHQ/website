/**
 * Pure similarity and clustering functions. Zero external dependencies.
 */

// --- TF-IDF based similarity ---

export interface IdfIndex {
  idf: Map<string, number>;
  docCount: number;
}

/**
 * Build an IDF index from a collection of documents (title + body text).
 */
export function buildIdfIndex(documents: string[]): IdfIndex {
  const docCount = documents.length;
  if (docCount === 0) return { idf: new Map(), docCount: 0 };

  const docFreq = new Map<string, number>();
  for (const doc of documents) {
    const words = extractKeywords(doc);
    for (const w of words) {
      docFreq.set(w, (docFreq.get(w) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [word, df] of docFreq) {
    idf.set(word, Math.log(docCount / (1 + df)));
  }

  return { idf, docCount };
}

/**
 * Compute TF-IDF vector for a text given an IDF index.
 */
function tfidfVector(text: string, idf: IdfIndex): Map<string, number> {
  const words = normalize(text).split(" ").filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  const tf = new Map<string, number>();
  for (const w of words) {
    tf.set(w, (tf.get(w) ?? 0) + 1);
  }

  const vec = new Map<string, number>();
  for (const [word, count] of tf) {
    const idfVal = idf.idf.get(word) ?? Math.log(idf.docCount + 1);
    vec.set(word, count * idfVal);
  }
  return vec;
}

/**
 * Cosine similarity between two TF-IDF vectors.
 */
export function tfidfCosineSimilarity(textA: string, textB: string, idf: IdfIndex): number {
  if (idf.docCount === 0) return similarity(textA, textB); // fallback to Levenshtein

  const vecA = tfidfVector(textA, idf);
  const vecB = tfidfVector(textB, idf);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [word, valA] of vecA) {
    normA += valA * valA;
    const valB = vecB.get(word);
    if (valB) dotProduct += valA * valB;
  }
  for (const [, valB] of vecB) {
    normB += valB * valB;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// --- Legacy Levenshtein (kept as fallback) ---

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

// --- Clustering ---

interface ClusterCandidate {
  title: string;
  body: string;
  category: string | null;
  published_at: string | null;
}

export function computeClusterScore(
  a: ClusterCandidate,
  b: ClusterCandidate,
  idf?: IdfIndex,
): number {
  const titleSim = idf
    ? tfidfCosineSimilarity(a.title, b.title, idf)
    : similarity(a.title, b.title);
  const bodySim = keywordOverlap(a.body ?? "", b.body ?? "");
  const timeSim = temporalProximity(a.published_at, b.published_at);
  const catMatch = (a.category && b.category && a.category === b.category) ? 1.0 : 0;

  // Weights: 40% title (TF-IDF or Levenshtein), 30% body, 15% temporal, 15% category
  return titleSim * 0.4 + bodySim * 0.3 + timeSim * 0.15 + catMatch * 0.15;
}

export function isClusterMatch(
  a: ClusterCandidate,
  b: ClusterCandidate,
  threshold = 0.55,
  idf?: IdfIndex,
): boolean {
  return computeClusterScore(a, b, idf) >= threshold;
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
