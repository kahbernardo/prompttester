import { LlmResult } from "@/shared/types";
import { SimilarityEdge } from "@/lib/analytics/types";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
  );
}

export function computeSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersection += 1;
  });
  const union = tokensA.size + tokensB.size - intersection;
  if (union <= 0) return 0;
  return Number(((intersection / union) * 100).toFixed(2));
}

export function buildPairSimilarities(results: LlmResult[]): SimilarityEdge[] {
  const edges: SimilarityEdge[] = [];
  for (let i = 0; i < results.length; i += 1) {
    for (let j = i + 1; j < results.length; j += 1) {
      const similarityPct = computeSimilarity(results[i].responseText, results[j].responseText);
      edges.push({
        from: results[i].model,
        to: results[j].model,
        similarityPct,
        divergent: similarityPct < 35
      });
    }
  }
  return edges.sort((a, b) => a.similarityPct - b.similarityPct);
}
