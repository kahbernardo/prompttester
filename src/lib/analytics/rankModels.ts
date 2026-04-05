import { ModelAnalytics } from "@/lib/analytics/types";

export type RankingFocus = "balanced" | "costBenefit" | "speed";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeLogRange(value: number, best: number, worst: number, lowerIsBetter = true): number {
  if (!Number.isFinite(value) || value <= 0 || best <= 0 || worst <= 0 || best === worst) {
    return 0;
  }
  const logValue = Math.log10(value);
  const logBest = Math.log10(best);
  const logWorst = Math.log10(worst);
  const denominator = Math.abs(logWorst - logBest);
  if (denominator === 0) return 0;
  const raw = lowerIsBetter ? (logWorst - logValue) / denominator : (logValue - logWorst) / denominator;
  return clamp01(raw);
}

function efficiencyScore(costPerQuality: number): number {
  // Faixa pragmatica para estabilizar o score entre execucoes:
  // melhor ~1e-6, pior ~1e-2 (menor e melhor).
  return normalizeLogRange(Math.max(costPerQuality, 1e-9), 1e-6, 1e-2, true);
}

function latencyScore(latencyMs: number): number {
  // Faixa pragmatica de latencia: melhor ~400ms, pior ~12000ms (menor e melhor).
  return normalizeLogRange(Math.max(latencyMs, 1), 400, 12000, true);
}

export function rankModels(
  models: Omit<ModelAnalytics, "rankingScore" | "badges">[],
  withConsistency: boolean,
  focus: RankingFocus = "balanced"
): ModelAnalytics[] {
  if (models.length === 0) return [];

  const ranked = models.map((model) => {
    const weights =
      focus === "costBenefit"
        ? { efficiency: 0.72, latency: 0.18, consistency: 0.1 }
        : focus === "speed"
          ? { efficiency: 0.18, latency: 0.72, consistency: 0.1 }
          : { efficiency: 0.52, latency: 0.33, consistency: 0.15 };
    const efficiencyNorm = efficiencyScore(model.costPerQuality);
    const latencyNorm = latencyScore(model.totalLatencyMs);
    const consistencyNorm = clamp01((model.consistencyScore ?? 0) / 10);
    const activeConsistencyWeight = withConsistency ? weights.consistency : 0;
    const activeWeightSum = weights.efficiency + weights.latency + activeConsistencyWeight;
    const score =
      activeWeightSum > 0
        ? (efficiencyNorm * weights.efficiency +
            latencyNorm * weights.latency +
            consistencyNorm * activeConsistencyWeight) /
          activeWeightSum
        : 0;
    return { ...model, rankingScore: Number((score * 10).toFixed(2)), badges: [] as string[] };
  });

  const bestEfficiency = [...ranked].sort((a, b) => a.costPerQuality - b.costPerQuality)[0]?.model;
  const fastest = [...ranked].sort((a, b) => a.totalLatencyMs - b.totalLatencyMs)[0]?.model;
  const mostConsistent = withConsistency
    ? [...ranked].sort((a, b) => (b.consistencyScore ?? 0) - (a.consistencyScore ?? 0))[0]?.model
    : undefined;

  ranked.forEach((item) => {
    const badges: string[] = [];
    if (item.model === bestEfficiency) badges.push("Best cost-benefit");
    if (item.model === fastest) badges.push("Fastest");
    if (withConsistency && item.model === mostConsistent) badges.push("Most consistent");
    item.badges = badges;
  });

  return ranked.sort((a, b) => b.rankingScore - a.rankingScore);
}
