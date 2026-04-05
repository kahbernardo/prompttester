import { classifyResponse } from "@/lib/analytics/classifyResponse";
import { computeConsistencyByModel } from "@/lib/analytics/consistency";
import { computeCostPerQuality, computeCostPerToken, computeVerbosityScore, estimateTtft } from "@/lib/analytics/efficiency";
import { rankModels, RankingFocus } from "@/lib/analytics/rankModels";
import { scoreResponse } from "@/lib/analytics/scoreResponse";
import { buildPairSimilarities } from "@/lib/analytics/similarity";
import { computeHistoricalTrends } from "@/lib/analytics/trends";
import { AnalyticsBundle, FallbackRecommendation, ModelAnalytics } from "@/lib/analytics/types";
import { HistoryItem, LlmResult } from "@/shared/types";

function deriveFallbacks(models: ModelAnalytics[], similarities: ReturnType<typeof buildPairSimilarities>): FallbackRecommendation[] {
  const result: FallbackRecommendation[] = [];
  models.forEach((base) => {
    const candidates = models.filter((item) => item.model !== base.model);
    if (candidates.length === 0) return;

    let bestCandidate = candidates[0];
    let bestScore = -1;

    candidates.forEach((candidate) => {
      const edge = similarities.find(
        (item) =>
          (item.from === base.model && item.to === candidate.model) ||
          (item.from === candidate.model && item.to === base.model)
      );
      const similarity = edge?.similarityPct ?? 0;
      const latencyDeltaPct = Math.abs(candidate.totalLatencyMs - base.totalLatencyMs) / Math.max(base.totalLatencyMs, 1);
      const costDeltaPct = Math.abs(candidate.raw.costUsd - base.raw.costUsd) / Math.max(base.raw.costUsd, 0.000001);
      const score = similarity * 0.7 + (1 - Math.min(latencyDeltaPct, 1)) * 20 + (1 - Math.min(costDeltaPct, 1)) * 10;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    });

    const edge = similarities.find(
      (item) =>
        (item.from === base.model && item.to === bestCandidate.model) ||
        (item.from === bestCandidate.model && item.to === base.model)
    );
    const similarityPct = edge?.similarityPct ?? 0;
    const latencyDeltaPct = Number(
      ((Math.abs(bestCandidate.totalLatencyMs - base.totalLatencyMs) / Math.max(base.totalLatencyMs, 1)) * 100).toFixed(2)
    );
    const costDeltaPct = Number(
      ((Math.abs(bestCandidate.raw.costUsd - base.raw.costUsd) / Math.max(base.raw.costUsd, 0.000001)) * 100).toFixed(2)
    );
    result.push({
      model: base.model,
      fallbackModel: bestCandidate.model,
      similarityPct,
      latencyDeltaPct,
      costDeltaPct
    });
  });
  return result;
}

export function buildAnalytics(
  results: LlmResult[],
  batchRuns: LlmResult[][],
  history: HistoryItem[],
  withConsistency: boolean,
  rankingFocus: RankingFocus = "balanced"
): AnalyticsBundle {
  if (results.length === 0) {
    return { models: [], similarities: [], fallbacks: [], trends: computeHistoricalTrends(history), history };
  }

  const consistencyMap = withConsistency ? computeConsistencyByModel(batchRuns.length > 0 ? batchRuns : [results]) : {};
  const baseModels = results.map<Omit<ModelAnalytics, "rankingScore" | "badges">>((result) => {
    const qualityScore = scoreResponse(result.responseText);
    return {
      model: result.model,
      provider: result.provider,
      qualityScore,
      costPerQuality: computeCostPerQuality(result.costUsd, qualityScore),
      ttftMs: estimateTtft(result.latencyMs, result.outputTokens, result.inputTokens),
      totalLatencyMs: result.latencyMs,
      costPerToken: computeCostPerToken(result.costUsd, result.inputTokens, result.outputTokens),
      verbosityScore: computeVerbosityScore(result.responseText, result.outputTokens),
      classification: classifyResponse(result.responseText),
      consistencyScore: withConsistency ? (consistencyMap[result.model] ?? null) : null,
      raw: result
    };
  });

  const ranked = rankModels(baseModels, withConsistency, rankingFocus);
  const similarities = buildPairSimilarities(results);
  const fallbacks = deriveFallbacks(ranked, similarities);
  const trends = computeHistoricalTrends(history);

  return {
    models: ranked,
    similarities,
    fallbacks,
    trends,
    history
  };
}
