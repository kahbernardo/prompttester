import { TrendPoint } from "@/lib/analytics/types";
import { HistoryItem } from "@/shared/types";

export function computeHistoricalTrends(history: HistoryItem[]): TrendPoint[] {
  const bucket: Record<string, { sumLatency: number; sumCost: number; count: number }> = {};
  history.forEach((item) => {
    item.results.forEach((result) => {
      if (!bucket[result.model]) {
        bucket[result.model] = { sumLatency: 0, sumCost: 0, count: 0 };
      }
      bucket[result.model].sumLatency += result.latencyMs;
      bucket[result.model].sumCost += result.costUsd;
      bucket[result.model].count += 1;
    });
  });

  return Object.entries(bucket)
    .map(([model, data]) => ({
      model,
      avgLatencyMs: Number((data.sumLatency / data.count).toFixed(2)),
      avgCostUsd: Number((data.sumCost / data.count).toFixed(6)),
      usageCount: data.count
    }))
    .sort((a, b) => b.usageCount - a.usageCount);
}
