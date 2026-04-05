function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeCostPerQuality(costUsd: number, qualityScore: number): number {
  if (qualityScore <= 0) return Number.POSITIVE_INFINITY;
  return Number((costUsd / qualityScore).toFixed(8));
}

export function computeCostPerToken(costUsd: number, inputTokens: number, outputTokens: number): number {
  const total = inputTokens + outputTokens;
  if (total <= 0) return 0;
  return Number((costUsd / total).toFixed(10));
}

export function computeVerbosityScore(text: string, outputTokens: number): number {
  if (!text.trim() || outputTokens <= 0) return 0;
  const markers =
    (text.match(/```[\s\S]*?```/g) ?? []).length * 3 +
    (text.match(/^\s*([-*]|\d+\.)\s+/gm) ?? []).length * 1.5 +
    (text.match(/^#{1,4}\s+/gm) ?? []).length * 2 +
    (text.match(/^[A-Z][\w\s]{2,}:\s*$/gm) ?? []).length * 1.5;
  const density = markers / Math.max(outputTokens, 1);
  const target = clamp(density * 22, 0, 1);
  return Number((target * 10).toFixed(2));
}

export function estimateTtft(totalLatencyMs: number, outputTokens: number, inputTokens: number): number {
  const tokenPressure = clamp(outputTokens / Math.max(inputTokens, 1), 0.2, 3);
  const ratio = clamp(0.18 + tokenPressure * 0.07, 0.18, 0.52);
  const ttft = Math.min(totalLatencyMs * 0.75, Math.max(80, totalLatencyMs * ratio));
  return Math.round(ttft);
}
