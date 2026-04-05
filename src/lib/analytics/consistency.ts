import { computeSimilarity } from "@/lib/analytics/similarity";
import { LlmResult } from "@/shared/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeConsistencyByModel(batchRuns: LlmResult[][]): Record<string, number> {
  const byModel: Record<string, LlmResult[]> = {};
  batchRuns.forEach((run) => {
    run.forEach((result) => {
      if (!byModel[result.model]) byModel[result.model] = [];
      byModel[result.model].push(result);
    });
  });

  const scores: Record<string, number> = {};
  Object.entries(byModel).forEach(([model, results]) => {
    if (results.length <= 1) {
      scores[model] = 10;
      return;
    }

    const similarities: number[] = [];
    for (let i = 0; i < results.length; i += 1) {
      for (let j = i + 1; j < results.length; j += 1) {
        similarities.push(computeSimilarity(results[i].responseText, results[j].responseText) / 100);
      }
    }
    const avgSimilarity = similarities.reduce((acc, value) => acc + value, 0) / Math.max(similarities.length, 1);

    const latencies = results.map((item) => item.latencyMs);
    const costs = results.map((item) => item.costUsd);
    const avgLatency = latencies.reduce((acc, value) => acc + value, 0) / latencies.length;
    const avgCost = costs.reduce((acc, value) => acc + value, 0) / costs.length;

    const latencyVar = avgLatency > 0 ? stdDev(latencies) / avgLatency : 0;
    const costVar = avgCost > 0 ? stdDev(costs) / avgCost : 0;

    const stability = clamp(avgSimilarity * 0.6 + (1 - clamp(latencyVar, 0, 1)) * 0.25 + (1 - clamp(costVar, 0, 1)) * 0.15, 0, 1);
    scores[model] = Number((stability * 10).toFixed(2));
  });

  return scores;
}
